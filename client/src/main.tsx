import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import App from './App';
import Landing from './Landing';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Routes><Route path="/" element={<Landing/>}/><Route path="/app" element={<App/>}/><Route path="/app/:screen" element={<App/>}/><Route path="/app/:screen/:id" element={<App/>}/><Route path="*" element={<main className="loading"><h1>Page not found</h1><a href="/">Return to FoodBridge</a></main>}/></Routes></BrowserRouter></React.StrictMode>);
