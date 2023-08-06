import './Sidebar.css'

import { PropsWithChildren, useState } from 'react'
import { GoSidebarCollapse, GoSidebarExpand, GoHome } from 'react-icons/go';
import { Link } from 'react-router-dom';
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
    return (
        <Link className="taisteal-sidebar-panel taisteal-sidebar-button" id="sidebar-home-button" to={getRouteForIndex()}>
            <GoHome />
        </Link>
    );
}

type SidebarProps = {
    renderHomeButton?: boolean,
}

function Sidebar({renderHomeButton = true, children}: PropsWithChildren<SidebarProps>) {
    const [visible, setVisible] = useState(true);

    const handleHideClick = () => {
        setVisible(!visible);
    }
    return (
        <div id="taisteal-sidebar">
            {renderHomeButton && <SidebarHomeButton />}
            <SidebarHideToggle sidebarVisible={visible} handleClick={handleHideClick}/>
            {visible && children}
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
