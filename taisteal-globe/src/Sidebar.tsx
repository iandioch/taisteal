import './Sidebar.css'

import { PropsWithChildren, useState, useEffect } from 'react'
import { GoSidebarCollapse, GoSidebarExpand, GoHome } from 'react-icons/go';
import { Link, useLocation } from 'react-router-dom';
import { getRouteForIndex } from 'routes';

type SidebarHideToggleProps = {
    handleClick: () => void;
    sidebarVisible: boolean;
}

function SidebarHideToggle(props: SidebarHideToggleProps) {
    return (
        <div className="taisteal-sidebar-panel taisteal-sidebar-button" id="sidebar-hide-toggle" onClick={props.handleClick}>
            {props.sidebarVisible ? <GoSidebarCollapse /> : <GoSidebarExpand />}
        </div>
    );
}

function SidebarHomeButton() {
    // Only want to render this when outside of the homepage
    const [visible, setVisible] = useState(true);
    let location = useLocation();
    useEffect(() => {
        console.log("checking sidebar home button", location.pathname);
        setVisible(location.pathname !== '/');
    }, [location]);
    if (!visible) return null;
    return (
        <Link className="taisteal-sidebar-panel taisteal-sidebar-button" id="sidebar-home-button" to={getRouteForIndex()}>
            <GoHome />
        </Link>
    );
}

type SidebarProps = {
}

function Sidebar(props: PropsWithChildren<SidebarProps>) {
    const [visible, setVisible] = useState(true);

    const handleHideClick = () => {
        setVisible(!visible);
    }
    return (
        <div id="taisteal-sidebar">
            <SidebarHomeButton />
            <SidebarHideToggle sidebarVisible={visible} handleClick={handleHideClick}/>
            {visible && props.children}
        </div>
    )
}

type SidebarPanelProps = {};

function SidebarPanel(props: PropsWithChildren<SidebarPanelProps>) {
    return (
        <div className="taisteal-sidebar-panel">{props.children}</div>
    )
}

export {Sidebar, SidebarPanel};
