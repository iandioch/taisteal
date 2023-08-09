import { Location } from 'types';
import { getRouteForPOI, getRouteForCountryCode } from 'routes';

import { Link } from 'react-router-dom';

type POILinkProps = {
    location: Location,
}

export function POILink(props: POILinkProps) {
    return (<>
        <Link to={getRouteForPOI(props.location.id)}>
            <p className="underline rounded hover:ring hover:ring-slate-200 hover:bg-slate-100" >{props.location.name}</p>
        </Link>
    </>);
}

type CountryLinkProps = {
    countryCode: string,
    countryName: string,
}
export function CountryLink(props: CountryLinkProps) {
    return (<>
        <Link to={getRouteForCountryCode(props.countryCode)}>
            <p className="underline rounded hover:ring hover:ring-slate-200 hover:bg-slate-100" >{props.countryName}</p>
        </Link>
    </>);
}
