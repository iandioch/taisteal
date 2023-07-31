import React from 'react'
import renderInfoForPOI from './action'

type POIProps = {
    text: string,
    id: string,
};

const POI = (props: POIProps) => {
    const {text, id} = props;
    function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
        renderInfoForPOI(id);
    }
    // TODO: do icons
    return (
        <a className="poi" href='#' onClick={handleClick}>{text}</a>
    );
}
