import { Location } from 'types';
import { getRouteForPOI } from 'routes';

import { Link } from 'react-router-dom';

type POILinkProps = {
    location: Location,
}

export function POILink(props: POILinkProps) {
    return (<>
        <Link to={getRouteForPOI(props.location.id)}>
            <p>{props.location.name}</p>
        </Link>
    </>);
}
