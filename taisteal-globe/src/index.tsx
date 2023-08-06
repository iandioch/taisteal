import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    createBrowserRouter,
    RouterProvider
} from 'react-router-dom';
import './index.css';
import Root from './routes/root';
import POI from './routes/poi';
import reportWebVitals from './reportWebVitals';
import store from 'store';
import { Provider  } from 'react-redux';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Root />,
    },
    {
        path: "poi/:id",
        element: <POI />
    },
]);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
        <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);

