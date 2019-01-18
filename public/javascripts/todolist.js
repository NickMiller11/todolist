$(function() {
  const addTodoHandlebar = Handlebars.compile($('#modalAddTodo').html());
  const editTodoHandlebar = Handlebars.compile($('#modalEditTodo').html());
  const mainpageHandlebar = Handlebars.compile($('#mainList').html());
  const todoLineItem = Handlebars.compile($('#todoLineItem').html());
  const allTodosHandlebar = Handlebars.compile($('#allTodos').html());
  const completedTodosHandlebar = Handlebars.compile($('#completedTodos').html());
  Handlebars.registerPartial('todoLineItem', $('#todoLineItem').html());

  let mainpageTitle;

  const ui = {
    clearModalListener: function() {
      $('#overlayContainer').on('click', function(e) {
        if ($(e.target).attr('id') === 'overlayContainer') {
          api.getAllTodos();
        }
      });
    },

    displayAddModal: function() {
      $('main').append(addTodoHandlebar()).hide().fadeIn(600);
      ui.clearModalListener();
    },

    renderMainpage: function(data, e) {
      $('h1').html(mainpageTitle + '<span id="totalTodos" class="blue_circle"></span>');
      $('#totalTodos').text(data.length);
      $('#mainListScreen').html(mainpageHandlebar({ todos: data }));

      app.updateTodoTitles();
      app.moveCompletedToCheckedList();
      ui.applyCheckedClasses(data)
    },

    renderNavBar: function(data, e) {
      e = e || undefined;

      let allTodosCount = data.length;

      let completedTodosCount = data.filter(function(todo) {
        return todo.completed === true;
      }).length;

      let convertedData = app.convertDataToDateCounts(data)
      let navAllTodos = convertedData[0];
      let navCompletedTodos = convertedData[1];

      $('nav dl').html(allTodosHandlebar({ allTodos: navAllTodos }));
      $('nav dl').append(completedTodosHandlebar({ completed: navCompletedTodos }));
      $('#allTodosCount').text(allTodosCount);
      $('#completedTodosCount').text(completedTodosCount);

      if (!!e && ($(e.currentTarget).hasClass('nav') || $(e.target).attr('id') === 'saveNewTodo')) {
        mainpageTitle = app.calculateMainlistTitle(data, e);
      }

      let filteredData = app.filterData(data, e);
      this.renderMainpage(filteredData, e);
    },

    renderEditContact: function(data) {
      $('main').append(editTodoHandlebar(data)).hide().fadeIn(600);
      this.selectDate(data);

      ui.clearModalListener();
    },

    selectDate: function(data) {
      let day = data['day'];
      let month = data['month'];
      let year = data['year'];

      $('#day').val(day).prop('selected', true);
      $('#month').val(month).prop('selected', true);
      $('#year').val(year).prop('selected', true);
    },

    applyCheckedClasses: function(data) {
      data.forEach(function (todo) {
        let id = todo['id'];

        if (todo['completed']) {
          $(`li[data-id="${id}"]`).addClass('checked');
          $(`li[data-id="${id}"] .box`).remove();
          $('<img src="images/ticked-box.png" alt="Ticked box" class="box">').insertBefore(`li[data-id="${id}"] label`);
        }
      });
    },

    cannotComplete: function() {
      alert('You cannot complete a todo that has not been created yet.');
    },
  };

  const api = {
    addTodo: function(e) {
      let request = new XMLHttpRequest();
      request.open('POST', 'http://localhost:4567/api/todos');
      request.setRequestHeader('Content-Type', 'application/json');

      let data = {
        'title': $('#title').val(),
        'month': $('#month').val(),
        'day': $('#day').val(),
        'year': $('#year').val(),
        'description': $('#description').val(),
      };

      let json = JSON.stringify(data);
      request.send(json);

      $(request).on('load', function() {
        if (request.status === 201) {
          api.getAllTodos(e);
        } else {
          alert('You must enter a title at least 3 characters long.');
        }
      });
    },

    getAllTodos: function(e) {
      let request = new XMLHttpRequest();
      request.open('GET', 'http://localhost:4567/api/todos');

      request.addEventListener('load', function(event) {
        let data = JSON.parse(request.response);

        if ($('#menuToggle')) { $('#menuToggle').remove(); }
        if ($('#overlayContainer')) {
          $('#overlayContainer').unbind('click');
          $('#overlayContainer').remove();
        }

        ui.renderNavBar(data, e);
      });

      request.send();
    },

    deleteTodo: function(e) {
      let id = $(e.target).closest('a').attr('data-id');
      let request = new XMLHttpRequest();

      request.open('DELETE', `http://localhost:4567/api/todos/${id}`);
      request.setRequestHeader('Content-Type', 'application/json');

      request.addEventListener('load', function(event) {
        if (request.status === 204) {
          api.getAllTodos(e);
        }
      });

      request.send();
    },

    getSingleTodo: function(e) {
      let id = $(e.target).closest('li').attr('data-id');
      let request = new XMLHttpRequest();
      request.open('GET', `http://localhost:4567/api/todos/${id}`);

      request.addEventListener('load', function(event) {
        let data = JSON.parse(request.response);
        ui.renderEditContact(data);
      });

      request.send();
    },

    markAsComplete: function(e) {
      let id = $(e.target).closest('li').attr('data-id');
      let request = new XMLHttpRequest();

      request.open('PUT', `http://localhost:4567/api/todos/${id}`);
      request.setRequestHeader('Content-Type', 'application/json');

      let data = {
        'completed': true,
      };

      let json = JSON.stringify(data);

      request.send(json);
      $(request).on('load', function() {
        if (request.status === 201) {
          api.getAllTodos();
        }
      });
    },

    toggleCompletedStatus: function(e) {
      let id = $(e.target).closest('li').attr('data-id');
      let completed = $(e.target).closest('li').attr('data-status');
      let status;

      if (completed === 'true') {
        status = false;
      } else {
        status = true;
      }

      let data = {
        'completed': status,
      };

      let request = new XMLHttpRequest();

      request.open('PUT', `http://localhost:4567/api/todos/${id}`);
      request.setRequestHeader('Content-Type', 'application/json');

      let json = JSON.stringify(data);

      $(request).on('load', function() {
        if (request.status === 201) {
          api.getAllTodos(e);
        }
      });

      request.send(json);
    },

    updateTodo: function(e) {
      let id = $(e.target).closest('form').attr('data-id');
      let request = new XMLHttpRequest();

      request.open('PUT', `http://localhost:4567/api/todos/${id}`);
      request.setRequestHeader('Content-Type', 'application/json');

      let data = {
        'title': $('#title').val(),
        'month': $('#month').val(),
        'day': $('#day').val(),
        'year': $('#year').val(),
        'description': $('#description').val(),
        'completed': $(e.target).attr('id') === 'editSave' ? false : true,
      };

      let json = JSON.stringify(data);
      request.send(json);

      $(request).on('load', function() {
        if (request.status === 201) {
          api.getAllTodos(e);
        } else {
          alert('You must enter a title at least 3 characters long.');
        }
      });
    },
  };

  const app = {

    // Sorts nav section list
    sortTodosArray: function(todos) {
      let sortDatesByMonthAndYear = function(a, b) {
        if (+a.date.slice(3) < +b.date.slice(3)) {
          return -1;
        } else if (+a.date.slice(3) > +b.date.slice(3)) {
          return 1;
        } else if (+a.date.slice(3) === +b.date.slice(3)) {
          return +a.date.slice(0, 2) - +b.date.slice(0, 2);
        }
      }

      let noDueDate = todos.filter(function(dateCount) {
        return dateCount.date === 'No Due Date';
      });

      todos = todos.filter(function(dateCount) {
        return dateCount.date !== 'No Due Date';
      })

      todos = todos.sort(sortDatesByMonthAndYear);

      if (noDueDate.length === 1) {
        todos.unshift(noDueDate[0]);
      }

      return todos;
    },

    // Returns an array of subarrays containing objects with counts of all
    // todos and completed todos by date

    convertDataToDateCounts: function(data) {
      let navAllTodos = [];
      let navCompletedTodos = [];

      data.forEach(function(todo) {
        let date;

        let checkDates = function(dateCount) {
          return dateCount['date'] === date;
        }

        let addOrIncrement = function(array) {
          if (array.some(checkDates)) {
            array.filter(checkDates)[0]['count'] += 1;
          } else {
            array.push({
              'date': date,
              'count': 1,
            });
          }
        }

        if (todo.month && todo.year) {
          date = todo.month + '/' + todo['year'].slice(2);
        } else {
          date = 'No Due Date';
        }

        addOrIncrement(navAllTodos);

        if (todo.completed === true) {
          addOrIncrement(navCompletedTodos);
        }
      });

      navAllTodos = app.sortTodosArray(navAllTodos);
      navCompletedTodos = app.sortTodosArray(navCompletedTodos);

      return [navAllTodos, navCompletedTodos];
    },

    // Calls a method to complete a todo only if it is clicked on the right place

    checkToggleCompleted: function(e) {
      if ($(e.target).hasClass('dontComplete')) {
        return;
      }
      api.toggleCompletedStatus(e);
    },

    moveCompletedToCheckedList: function() {
      let $listItems = $('#mainListScreen').find('li')

      $listItems.each(function() {
        let $this = $(this);

        if ($this.attr('data-status') === 'true') {
          $this.remove();
          $('#checkedList').append($this);
        }
      });
    },

    // Adds a date or 'No Due Date' to the titles of the todo items

    updateTodoTitles: function() {
      let $listItems = $('#mainListScreen').find('li')

      $listItems.each(function() {
        let $this = $(this);
        let $month = $this.attr('data-month');
        let $year = $this.attr('data-year');
        let $additionalInfo = $this.find('#additionalInfo');

        if ($month && $year) {
          $year = $year.slice(2);
          $additionalInfo.text(`${$month}/${$year} `);
        } else {
          $additionalInfo.text('No Due Date');
        }
      });
    },

    calculateMainlistTitle: function(data, e) {
      let date;

      if ($(e.target).attr('id') === 'allTodosList' || $(e.target).attr('id') === 'completedTodosList') {
        date = $(e.target).closest('dt')[0].firstChild.data;
      } else if ($(e.target).attr('id') === 'allTodosCount' || $(e.target).attr('id') === 'completedTodosCount') {
        date = $(e.target).closest('dt')[0].firstChild.data;
      } else if ($(e.target).attr('id') === 'saveNewTodo') {
        date = 'All Todos';
      } else {
        date = $(e.target).closest('dd')[0].firstChild.data;
      }

      return date;
    },

    // Filters todos for the main page based on nav bar selection

    filterData: function(data, e) {
      let isComplete = function(todo) {
        return todo.completed === true;
      }

      // Filter data for todos with no due dates
      if (mainpageTitle === 'No Due Date') {
        data = data.filter(function(todo) {
          return !todo.month || !todo.year;
        });

        // Filter data for no due dates + completed
        if ($(e.target).hasClass('completedTodosDate')) {
          data = data.filter(isComplete);
        }

      // Filter data for all todos
      } else if (mainpageTitle === 'All Todos') {
        return data;

      // Filter data for complete todos
      } else if (mainpageTitle === 'Completed') {
        data = data.filter(isComplete);

      // Filter data for specific dates under All Todos
      } else {
        let month = mainpageTitle.slice(0, 2);
        let year = mainpageTitle.slice(3);

        data = data.filter(function(todo) {
          if (todo.month && todo.year) {
            return todo.month === month && todo.year.slice(2) === year;
          }
        });

        // Filter data for specific dates under complete todos
        if ($(e.target).hasClass('completedTodosDate')) {  // Filter data for specific dates + completed
          data = data.filter(isComplete);
        }
      }

      return data;
    },

    bindEvents: function() {
      $('main').on('click', '#add', ui.displayAddModal.bind(this));
      $('main').on('click', '#saveNewTodo', api.addTodo.bind(this));
      $('main').on('click', '.trashDiv', api.deleteTodo.bind(this));
      $('main').on('click', '.title', api.getSingleTodo.bind(this));
      $('main').on('click', '#newComplete', ui.cannotComplete.bind(this));
      $('main').on('click', '.editButtons', api.updateTodo.bind(this));
      $('main').on('click', 'li', this.checkToggleCompleted.bind(this));
      $('nav').on('click', 'dt', api.getAllTodos.bind(this));
      $('nav').on('click', 'dd', api.getAllTodos.bind(this));
    },

    init: function() {
      api.getAllTodos();
      mainpageTitle = 'All Todos';
      this.bindEvents();
    },
  };

  app.init();
});
