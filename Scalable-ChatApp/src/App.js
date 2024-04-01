import './App.css';
import { ChatContext } from './Context/ChatContext';
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPanel from './Pages/MainPanel/MainPanel';
import Login from './Pages/Login/Login';
import Rooms from './Pages/Rooms/Rooms';

function App() {
  const api = "http://localhost:4000";
  const [store, setStore] = useState();
  const [showSearchResult, setShowSearchResult] = useState(false);

  const updateStore = (data) => {
    setStore(data);
  };

  return (
    <div className='mainApp'>
      <ChatContext.Provider value={{ api, store, updateStore, showSearchResult, setShowSearchResult }}>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} /> 
            <Route path="/mainpanel" element={<MainPanel />} />
            <Route path="/rooms" element={<Rooms />} />
          </Routes>
        </Router>
      </ChatContext.Provider>
    </div>
  );
}

export default App;
