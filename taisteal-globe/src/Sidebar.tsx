import './Sidebar.css'

import { PropsWithChildren, useState } from 'react'
import {GoSidebarCollapse, GoSidebarExpand} from 'react-icons/go';

type SidebarHideToggleProps = {
    handleClick: () => void;
    sidebarVisible: boolean;
}

function SidebarHideToggle(props: SidebarHideToggleProps) {
    return (
        <div className="taisteal-sidebar-panel" id="sidebar-hide-toggle" onClick={props.handleClick}>
            {props.sidebarVisible ? <GoSidebarCollapse /> : <GoSidebarExpand />}
        </div>
    );
}

type SidebarProps = {}

function Sidebar(props: PropsWithChildren<SidebarProps>) {
    const [visible, setVisible] = useState(true);

    const handleHideClick = () => {
        setVisible(!visible);
    }
    return (
        <div id="taisteal-sidebar">
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
