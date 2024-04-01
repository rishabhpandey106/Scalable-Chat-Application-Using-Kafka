import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [redirectToMainPanel, setRedirectToMainPanel] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (username.trim() !== '') {
      localStorage.setItem('username', username);
      alert('Username stored in local storage!');
      setRedirectToMainPanel(true); 
    } else {
      alert('Please enter a username');
    }
  };

  const handleChange = (event) => {
    setUsername(event.target.value);
  };

  if (redirectToMainPanel) {
    return <Navigate to="/mainpanel" />;
  }

  return (
    <div className="container">
      <h2 className="heading">Login</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label className="label" htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          name="username"
          placeholder="Enter your username"
          className="input"
          value={username}
          onChange={handleChange}
        />
        <button type="submit" className="button">Login</button>
      </form>
    </div>
  );
};

export default Login;
