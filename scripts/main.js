import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, History} from 'react-router';
import {createHistory} from 'history';

const firebaseUrl = 'https://day4-gallery.firebaseio.com/';
import Rebase from 're-base';
var base = Rebase.createClass(firebaseUrl);
import Firebase from 'firebase';
var ref = new Firebase(firebaseUrl);

var App = React.createClass({
  getInitialState: function() {
    return {
      all: {},
      item: null,
      loggedIn: false
    }
  },
  addNew: function(item) {
    var timestamp = (new Date()).getTime(); // item uid
    this.state.all[timestamp] = item;
    this.setState({all: this.state.all});
  },
  componentDidMount: function() {
    base.syncState('projects', {
      context: this,
      state: 'all'
    });
  },
  componentWillMount: function() {
    // check for token
    var token = localStorage.getItem('token');
    if (token) {
      ref.authWithCustomToken(token, (err, authData) => {
        if(err) { console.error(err); return; }

        const meRef = ref.child('owner');
        meRef.on('value', (snapshot) => {
          var data = snapshot.val() || {};
          if (data.me === authData.uid) { 
            this.setState({
              loggedIn: true
            });
          }
        });
      });
    }
  },
  logout: function() {
    ref.unauth();
    localStorage.removeItem('token');
    this.setState({
      loggedIn: false
    })
  },
  openItem: function(key) {
    this.state.item = key;
    this.setState({item: this.state.item});
  },
  closeItem: function() {
    this.state.item = null;
    this.setState({item: this.state.item});
  },
  render: function() {
    if (!!this.state.item) {
      return (
        <Item
          all={this.state.all}
          itemId={this.state.item}
          closeItem={this.closeItem}
        />
      );
    } else {
      // list mode
      return (
        <List
          all={this.state.all}
          openItem={this.openItem}
          loggedIn={this.state.loggedIn}
          logout={this.logout}
          addNew={this.addNew}
        />
      );
    }
  }
});

var List = React.createClass({
  openItem: function(key) {
    this.props.openItem(key);
  },
  showItemInListMode: function(key) {
    var item = this.props.all[key];
    return (
      <li key={key} className="itemListView" onClick={this.openItem.bind(this,key)}>
        <img className="itemImg" src={item.img}/><p className="itemName">{item.name}</p>
      </li>
    );
  },
  render: function() {
    return (
      <div>
        <SubmissionForm
          loggedIn={this.props.loggedIn}
          addNew={this.props.addNew}
          logout={this.props.logout}
        />
        <h1>Projects</h1>
        <ul className="listAll">
          {Object.keys(this.props.all).map(this.showItemInListMode)}
        </ul>
      </div>
    );
  }
});

var Item = React.createClass({
  render: function() {
    var details = this.props.all[this.props.itemId];
    return (
      <div className="itemFullView">
        <div className="itemHeader">
          <img className="itemFullImg" src={details.img} />
          <div className="itemInfo">
            <p className="itemName">{details.name}</p>
            <p className="itemDate">{details.date}</p>
          </div>
        </div>
        <p className="itemDesc">{details.desc}</p>
        <button onClick={this.props.closeItem}>Back</button>
      </div>
    );
  }
});

// authentication
// annoying bullshit
var SubmissionForm = React.createClass({
  addNew: function(event) {
    event.preventDefault();
    var newSubmission = {
      name: this.refs.name.value,
      date: this.refs.date.value,
      desc: this.refs.desc.value,
      img: this.refs.img.value
    };
    this.props.addNew(newSubmission);
    this.refs.submissionForm.reset();
  },
  render: function() {
    if (this.props.loggedIn) {
      return (
        <div className="loggedInThings">
          <form className="submissionForm" ref="submissionForm" onSubmit={this.addNew}>
            <input type="text" ref="name" placeholder="Name"/>
            <input type="text" ref="date" placeholder="Month, Year"/>
            <textarea ref="desc" placeholder="Description"></textarea>
            <input type="text" ref="img" placeholder="ImgSrc"/>
            <input type="submit"/>
          </form>
          <button onClick={this.props.logout}>Logout</button>
        </div>
      );
    } else {
      return (<p></p>);
    }
  }
});

var Signin = React.createClass({
  mixins: [History],
  getInitialState: function() {
    return {
      loggedIn: false
    };
  },
  componentWillMount: function() {
    // check for token n shit
    var token = localStorage.getItem('token');
    if (token) { ref.authWithCustomToken(token, this.authHandler); }
  },
  authenticate: function(provider) {
    ref.authWithOAuthPopup(provider, this.authHandler);
  },
  authHandler: function(err, authData) {
    if(err) { console.error(err); return; }
    localStorage.setItem('token',authData.token);

    const meRef = ref.child('owner');
    meRef.on('value', (snapshot) => {
      var data = snapshot.val() || {};
      if (data.me === authData.uid) { 
        this.setState({
          loggedIn: true
        });
      } else {
        alert("you are not authorized");
      }
      this.history.pushState(null, '/');
    });
  },
  render: function() {
    // only i can log in.
    return (
      <div className="login">
        <button onClick={this.authenticate.bind(this, 'github')}>sign in with github</button>
      </div>
    );
  }
});

var NotFound = React.createClass({
  render: function() {
    return (<p>not found</p>);
  }
});

var routes = (
  <Router history={createHistory()}>
    <Route path="/" component={App} />
    <Route path="/signIn" component={Signin} />
    <Route path="*" component={NotFound} />
  </Router>
);

ReactDOM.render(routes, document.querySelector('#main'));
