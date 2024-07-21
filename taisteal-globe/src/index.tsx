import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    createBrowserRouter,
    RouterProvider
} from 'react-router-dom';
import './index.css';
import Root from './routes/root';
import POI from './routes/poi';
import Country from './routes/country';
import Index from './routes/index';
import VisitsOverview from './routes/visits';
import RoutesOverview from './routes/routes';
import LegsOverview from './routes/legs';
import reportWebVitals from './reportWebVitals';
import store from 'store';
import { Provider  } from 'react-redux';
import { ClerkProvider } from '@clerk/clerk-react';



// TODO: this should read from routes.ts to keep in sync.
const router = createBrowserRouter([
    {
        path: '/',
        element: <Root />,
        children: [
            {
                path: "/",
                element: <Index />
            },
            {
                path: "poi/:id",
                element: <POI />
            },
            {
                path: "country/:id",
                element: <Country />
            },
            {
                path: 'visits',
                element: <VisitsOverview />
            },
            {
                path: 'routes',
                element: <RoutesOverview />
            },
            {
                path: 'edit/legs',
                element: <LegsOverview />
            }
        ]
    }
]);

const PUBLISHABLE_KEY = process.env.REACT_APP_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
    throw new Error("Could not get clerk publishable key from " + JSON.stringify(process.env));
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>
    </ClerkProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);

