import './Sidebar.css'

import { ReactElement, PropsWithChildren, useState, useEffect, useRef } from 'react'
import { GoSidebarCollapse, GoSidebarExpand, GoHome } from 'react-icons/go';
import { Link, useLocation } from 'react-router-dom';
import { getRouteForIndex } from 'routes';

type SidebarHideToggleProps = {
    handleClick: () => void;
    sidebarVisible: boolean;
}

function SidebarHideToggle(props: SidebarHideToggleProps) {
    return (
        <div className="taisteal-sidebar-panel taisteal-sidebar-button bg-slate-50 text-slate-600 text-xs" id="sidebar-hide-toggle" onClick={props.handleClick}>
            {props.sidebarVisible ? (<>See less <GoSidebarCollapse className="taisteal-sidebar-icon"/></>) : (<>See more <GoSidebarExpand className="taisteal-sidebar-icon"/></>)}
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
    if (!visible) {
        return null;
    }
    return (
        <Link className="taisteal-sidebar-panel taisteal-sidebar-button bg-slate-50 text-slate-600 text-xs" id="sidebar-home-button" to={getRouteForIndex()}>
            Home <GoHome className="taisteal-sidebar-icon" />
        </Link>
    );
}

function SidebarHero () {
    // TODO: this should float at the top left corner of the page, instead of
    // only above the highlight panel. It should also have a call-to-action.
    return (
        <SidebarPanel style={{"top": 0}}>
        Welcome to {"<TBD>"}, the best place to track your travel!
        </SidebarPanel>
    );
}

type SidebarProps = {
    highlight: ReactElement;
}

const setGlobePosition = (sidebarDiv: HTMLDivElement, visible: boolean) => {
    // Important to note here that the globe is by default horizontally centered.
    const elem = document.getElementById('globe-container');
    const windowWidth = window.innerWidth;
    const sidebarWidth = sidebarDiv.offsetWidth;
    if (!elem) return;

    if ((sidebarWidth > windowWidth / 2) || !visible) {
        elem.style.transform = "";
        elem.style.transition = "0.5s";
        return;
    }
    // We want to move the globe to be horizontally centered between the edge of
    // the sidebar and the right border of the window, so d is the distance it
    // must move.
    // TODO: is d just sidebarWidth/2 ?
    const d = (windowWidth/2) - (windowWidth-sidebarWidth)/2;
    elem.style.transform = `translate(${d}px, 0)`;
}

function Sidebar(props: PropsWithChildren<SidebarProps>) {
    const [visible, setVisible] = useState(false);
    const ref = useRef(null);

    const handleHideClick = () => {
        setVisible(!visible);
    }
    useEffect(() => {
        if (ref.current) {
            setGlobePosition(ref.current, visible);
        }
    }, [visible, ref]);
    return (
        <div ref={ref} id="taisteal-sidebar">
            {visible && <SidebarHero />}
            {props.highlight}
            <SidebarHomeButton />
            <SidebarHideToggle sidebarVisible={visible} handleClick={handleHideClick}/>
            {visible && props.children}
        </div>
    )
}

type SidebarPanelProps = {
    style?: React.CSSProperties
};

function SidebarPanel(props: PropsWithChildren<SidebarPanelProps>) {
    return (
        <div style={props.style} className="taisteal-sidebar-panel bg-slate-50 text-gray-800 text-sm">{props.children}</div>
    )
}

export {Sidebar, SidebarPanel};
