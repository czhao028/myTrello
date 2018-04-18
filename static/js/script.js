'use strict';
// Your client side JavaScript code goes here.
// This file is included in every page.

// Example code for creating a list on the server


//RENDERING FUNCTIONS
function renderBoardName(){
  loadBoardName().then(function(boardName){
    //console.log(boardName)
  $('.boardName').append('<input class="boardNameInput" value="'+boardName+'" onkeypress="updateBoardName(event)"/>')
  }); 
}

//just to avoid repeating myself
function addAddList(){
  return('<li id="addList" class="list addList"><input type="button" class="list addList buttonAdd" value="+" onclick="createList()" /></li>')
}

function cardRendering(card,card_id,listid){
  //console.log("cardRendering")
  return('<div class="card"><div class="arrow"><i class="sortUp fas fa-angle-up" kind="card" onclick="sortUpLeft(event)" listid='+listid+' cardid='+card_id+'></i> <i class="sortDown fas fa-angle-down" kind="card" onclick="sortDownRight(event)" listid='+listid+' cardid='+card_id+'></i></div><input class="cardName" id='+card_id+' listid="'+listid+'" value="'+card+'" onkeypress=updateCard(event) /><i class="cardRemove fas fa-times" listid='+listid+' cardid='+card_id+' onclick="removeCard(event)"></div>')
}

function listNameRendering(list){
  //console.log("listNameRendering")
  //console.log(list)
  return('<div class="entireListName"><div class="arrow"><i class="sortLeft fas fa-angle-left" listid='+list.id+' listpos='+list.pos+' kind="list" onclick="sortUpLeft(event)"></i> <i class="sortDownRight fas fa-angle-right" listid='+list.id+' listpos='+list.pos+' kind="list" onclick="sortDownRight(event)"></i></div><input class="listName" value="'+list.name+'" onkeypress="updateTitle(event)" listid='+list.id+' /><i class="listRemove fas fa-times" listid='+list.id+' listpos='+list.pos+' onclick="removeList(event)"></i></div>')
}

function renderList(list,isUpdate){
  //console.log(list)
  var curElem = $('<li class="list made" id='+list.id+'>').text('');
    curElem.append(listNameRendering(list))
    //console.log(list)
    curElem.append('<div class="cards">')
    if (list.cards) {
      
      var card_id=0
      list.cards.forEach(function(card) {
        curElem.append(cardRendering(card,card_id,list.id));
        card_id++;
      });
    }

    curElem.append('<div class="card newCard"><input placeholder="Add New Card" class="addCard" listID='+list.id+' onkeypress="addCard(event)" /></div></div>');
    if(isUpdate){
      //console.log(isUpdate, "isUpdate")
      $('.list#'+list.id).replaceWith(curElem)
    }
    else{

      $('#lists').append(curElem)
      if($('.addList')){
        //console.log($('.addList').length)
        $('.addList').remove();
        //console.log("removed")
        $('#lists').append(addAddList())
      }

    }
}


//CREATE/UPDATE FUNCTIONS
function createNewList() {
  var name = "New List";
  var cards = [];
  var pos = 0;
  //console.log(name,pos,cards)
  return $.ajax('/api/lists', {
    type: 'POST',
    data: {
      name: name
    }
  });
}

function createList(){
  return createNewList().then(function(data){
    //console.log(data)
    renderList(data,false)

  })
}

function addCard(e){
  if(e.charCode!==13){
    return false;
  }
  else{
    updateList(e.target.getAttribute('listid'),null,null,e.target.value,null)
  }
}

function updateCard(e){
  if(e.charCode!==13){
    return false;
  }
  else{
    updateList(e.target.getAttribute('listid'),null,null,e.target.value,e.target.getAttribute('id'))
  }
}

function updateTitle(e){
  //updateList(e.target)
   if(e.charCode!==13){
    return false;
  }
  else{
    updateList(e.target.getAttribute('listid'),e.target.value,null,null,null)
  }
}

function updateBoardName(e){
 if(e.charCode!==13){
  return false;
  }
  else{
    return $.ajax('/api/lists/boardName',{
      type:'POST',
      data:{
        boardName:e.target.value
      }
    })
  }
}

function updateList(listid,name,pos,card,card_id){
  $.ajax('/api/lists/update',{
      type:'POST',
      data:{
        listid: listid,
        name:name,
        pos:pos,
        card:card,
        card_id:card_id
      }
    }).then(function(data){
      renderList(data,true)
    })
}

function removeList(e){
  //console.log(e)
  //console.log(e.target)
  var listid = e.target.getAttribute("listid")
  //console.log ("TADA "+listid)
  $.ajax('/api/lists/remove',{
    type:'DELETE',
    data:{id:listid}
  }).then(function(data){
    //console.log("trying to remove")
    //$('.list').getElementById(listid).remove();
    //console.log($('.list#'+listid))
    $('.list#'+listid).remove()
  })
}

function sort(e,isMoveUpLeft){
  //console.log(arguments)
  var kind = e.target.getAttribute("kind")
  var listid = e.target.getAttribute("listid")

  var pos= 0;

  if(kind==="card"){
    pos = parseInt(e.target.getAttribute("cardid"))
  }
  else if(kind==='list'){
    //console.log(e.target.getAttribute("listpos"))
    pos=parseInt(e.target.getAttribute("listpos"))
  }
  else{}
  if(pos===0 && isMoveUpLeft===true){
    //console.log("uhoh")
    return;
  }
  else{
    //console.log("sorting now",pos )
    $.ajax('/api/lists/sort',{
      type:'POST',
      data:{
        isMovingUpLeft:isMoveUpLeft,
        listid:listid,
        pos:pos,
        kind:kind
      }
    }).then(function(data){
      //console.log(data)
      //display();
      if(kind=='list'){
        $('#lists').empty();
        display();
      }
      else if(kind=='card'){
        renderList(data.list,true)
      }
    })
  }
}

function sortUpLeft(e){
  //console.log("sorting upleft")
  sort(e,true)
}

function sortDownRight(e){
  //console.log("sorting down right")
  sort(e,false)
}

function removeCard(e){
  var listid = e.target.getAttribute("listid")
  var card_id = e.target.getAttribute("cardid")
  updateList(listid,null,null,null,card_id);
}

// GET functions
function loadLists() {
  return $.ajax('/api/lists');
}

function loadBoardName(){
 return  $.ajax('/api/lists/boardName',{
    type:'GET'
  }).then(function(data){
    //console.log(data)
    return data.boardName
  })
  // //console.log("Result"+result)
  // return result;
}


// Example code for displaying lists in the browser
function displayLists(lists) {
  //$('.boardName').append();
  // Lists should be ordered based on their 'pos' field
  lists.rows = _.sortBy(lists.rows, 'pos');
  //console.log(lists.rows)
  if(!lists.rows){
    //console.log("no rows?")
  }
  lists.rows.forEach(function(list) {
    renderList(list)
  });
  //$('#lists').append(addAddList());
}

function display(){
  loadLists().then(function(data){
    if (data.rows.length) {
      displayLists(data);
    } else {
      //console.log('No lists found, creating one.');
      createList()
    }
  })
}


//edited original because rendering occurs elsewhere
renderBoardName();
display();


//EVENT LISTENERS


