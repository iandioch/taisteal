import './Sidebar.css'

import { PropsWithChildren} from 'react'

type SidebarProps = {}

function Sidebar(props: PropsWithChildren<SidebarProps>) {
    return (
        <div id="taisteal-sidebar">
            {props.children}
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
