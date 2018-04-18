'use strict';
// Storage layer of our backend service. Uses a JSON file to store records.

// NPM dependencies
var fs = require('fs');
var _ = require('underscore');

// Manage persistence using a JSON file.
// Storage file layout:
// {
//    '[kind]': {
//      'nextId': 1,
//      'rows': [{'id': 0, '[field1]': [field1 value]}]
//    }
// }
var STORE_FILE = '.tmp/storage.json';

var initialized = false;
// Current application store state is stored here
var store = null;

var init = _.once(function() {
  console.log('Initializing storage...');
  // Create file if it doesn't exist
  if (! fs.existsSync(STORE_FILE)) {
    console.log('Creating new storage file.');
    if (! fs.existsSync('.tmp')) {
      fs.mkdirSync('.tmp');
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify({}));
  }

  store = JSON.parse(fs.readFileSync(STORE_FILE, {encoding: 'utf8'}));

  console.log('Done initializing storage. Read %s entities.', _.keys(store).length);
  initialized = true;
});


function writeData() {
  console.log('Writing data to storage file.');
  fs.writeFileSync(STORE_FILE, JSON.stringify(store), {encoding: 'utf8'});
}

// Get all entities of a particular kind
// ex. getAll('list') -> [{id: 1}, {id: 2},. . .]
function getAll(kind) {
  if (! store[kind]) {
    return [];
  }
  return store[kind].rows;
}

// Get many rows of the same kind.
// ex. getMany('list', [1, 2]) -> [{id: 1}, {id: 2}]
function getMany(kind, ids) {
  if (! ids) {
    return null;
  }

  if (! _.all(ids, _.isNumber)) {
    //throw new Error("Ids must be a numbers");
    return false;
  }

  if (! store[kind]) {
    return [];
  }

  return _.filter(store[kind].rows, function(row) {
    return _.contains(ids, row.id);
  });
}

// Get one row with given id. If no row is found, return null.
function getOne(kind, id) {
  //console.log(kind)
  if(kind==='boardName'){
    //console.log("i'm here")
    var entity = store[kind];
    if(!entity){
      upsert('boardName',"New Board").then(function(data){
        console.log(typeof(data))
        data=data[0]
        //console.log(data)
        //console.log(typeof(data))

        return data;
      })
    }
    else{
      return entity.boardName;
    }
  }
  else{

    if (! _.isNumber(id)) {
      //throw new Error("Id must be a number: " + id);
      return null;
    }

    var ret = getMany(kind, [id]);
    if (ret.length > 1) {
      console.warn('Found multiple entities with same id', ret);
      return ret[0];
    } else if (ret.length === 1) {
      return ret[0];
    }
    return null;
  }
}

function validatePos(pos){
  var lists=getAll('list')
  var acceptable=false;
  var unacceptable=false;
  if(pos===0){
    return true;
  }
  lists.forEach(function(list){
    if(list.pos==pos-1){
      acceptable=true;
    }
    if(list.pos==pos){
      unacceptable=true;
    }
  })
  return (acceptable && !unacceptable)
}

function updateList(id,name,pos,cardName,cardIndex,ignoreValidatePos){
  //console.log(arguments)
  if(!_.isNumber(id)){
    //throw new Error ("ID must be number. is type: "+typeof(id))
    return false;
  }
  var result = getOne('list',id)
  if(result===null){
    //throw new Error ("Invalid id")
    return false;
  }
  if(name && _.isString(name)){
    result.name = name;
    console.log("name changed")
  }
  if(_.isNumber(pos) && pos>=0){
    //console.log("gonna validate")
    if(validatePos(pos) || ignoreValidatePos){
      result.pos = pos
      //console.log("pos changed",ignoreValidatePos)
    }
  }
  if(_.isNumber(cardIndex) && cardIndex>=0){
    //console.log(cardIndex)
    if(cardName){
      result.cards[cardIndex]=cardName
      //console.log("card edited")
    }
    else{
      result.cards.splice(cardIndex,1)
    }
    
  }
  else if(cardName && _.isString(cardName)){
    result.cards.push(cardName);
    //console.log("card added")
  }
  writeData();
  return result
}


function reSort(kind, listid, isMovingUpLeft,pos){
  //console.log(isMovingUpLeft==='true')
  if(kind==='list'){
    var list1 = getOne(kind,listid)
    var swapPos=(isMovingUpLeft==='true')? pos-1 : pos+1;
    // if(isMovingUpLeft===true){
    //   console.log(isMovingUpLeft,"alternate swapPos")
    //   swapPos=pos-1;
    // }
    //console.log(pos,swapPos)
    var lists=getAll(kind);
    if(pos>=lists.length){
      return {success:false}
    }
    var swapWith = getAll(kind).filter(function(item){
      //console.log(swapPos,item.pos)
      return item.pos==swapPos;
    })
    //console.log(swapWith)
    if(swapWith.length===0){ return {success:false} };
    swapWith= swapWith[0]
    var result1 = updateList(list1.id,null,swapPos,null,null,true);
    var result2 = updateList(swapWith.id,null,pos,null,null);
    return {success: (result1 && result2),otherID:swapWith.id};
  }
  else if(kind==='card'){
    //console.log("card swap")
    var list = getOne('list',listid);
    var newPos = (isMovingUpLeft=='true') ? pos-1 : pos+1
    //console.log(list,newPos)
    if(newPos===0){
      list.cards = ([list.cards[1],list.cards[0]]).concat(list.cards.slice(2))
    }
    else{
      var card = list.cards.splice(pos,1)[0];
      list.cards.splice(newPos,0,card)
    }
    //console.log(list.cards)
    writeData();
    return {success:true,list:list}
  }
}


// Update or create a row with given entity 'kind'.
// * If 'row' has an 'id' and there's another row 'oldRow' with the same id,
//   'oldRow' is replaced with 'row'.
// * If 'row' has no 'id' or if there's no other row with the same id, a row is
//   inserted into our data storage layer.
function upsert(kind, row) {
  if(kind==='list'){
    if (row.id && ! _.isNumber(row.id)) {
      //throw new Error('Id must be number');
      return false;
    }
  
    var entity = store[kind];
    
    if (! entity) {
      //console.log('Creating new kind:', kind);
      entity = store[kind] = {nextId: 0, rows: []};
    }
  
    var found = false;
  
    if (! _.isUndefined(row.id)) {
      entity.rows = entity.rows.map(function(innerRow) {
        if (innerRow.id === row.id) {
          found = true;
          return row;
        }
        return innerRow;
      });
    }
  
    if (! found) {
      if (! row.id) {
        do {
          row.id = entity.nextId++;
        } while (_.any(entity.rows, function(innerRow) {
          return innerRow.id === row.id;
        }))
      }
      row.cards=[];
      row.pos = entity.rows.length;
      entity.rows.push(row);
    }
  
    writeData();
    return row;
  }
  else if(kind ==='boardName'){
    var entity = store[kind];
  
    if (! entity) {
      //console.log('Creating new kind:', kind);
      entity = store[kind] = row;
    }
    else{
      entity.boardName = row;
    }
    writeData();
    return row;

  }
}

// Delete row with given id of given entity kind.
// Returns true if row with id is found, false otherwise.
function del(kind, id) {
  var entity = store[kind];
  if (! entity) {
    return false;
  }

  var deletedPos=entity.length;

  var found = false;
  entity.rows = entity.rows.filter(function(row) {
    if (id === row.id) {
      //console.log(found + "removing")
      deletedPos=row.pos;
      found = true;
      return false; // return false delete this record
    }
    return true;
  });



  var lists=getAll('list')
  lists.forEach(function(list){
    if(list.pos>deletedPos){
      //console.log("reducing pos")
      list.pos--;

    }
  })

  if (found) {
    console.log("saving data")
    writeData();
  }

  return found;
}

init();

module.exports = {}
module.exports.getAll = getAll;
module.exports.getOne = getOne;
module.exports.getMany = getMany;
module.exports.upsert = upsert;
module.exports.del = del;
module.exports.updateList = updateList;
module.exports.reSort = reSort;
