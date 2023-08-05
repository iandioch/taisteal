import './Sidebar.css'

import { PropsWithChildren, useState } from 'react'

type SidebarHideToggleProps = {
    handleClick: () => void;
    sidebarVisible: boolean;
}

function SidebarHideToggle(props: SidebarHideToggleProps) {
    return (
        <div className="taisteal-sidebar-panel" id="sidebar-hide-toggle" onClick={props.handleClick}>
            <p>{props.sidebarVisible ? "Hide" : "Show"}</p>
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
            {visible && props.children}
            <SidebarHideToggle sidebarVisible={visible} handleClick={handleHideClick}/>
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
