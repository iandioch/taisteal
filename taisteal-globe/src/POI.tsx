import React from 'react'

type POIProps = {
    text: string,
    id: string,
};

const POI = (props: POIProps) => {
    const {text, id} = props;
    function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
        console.log("src/POI: handeClick");
    }
    // TODO: do icons
    return (
        <a className="poi" href='#' onClick={handleClick}>{text}</a>
    );
}
