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

const flagEmojiForCountryCode = (countryCode:string):string|null => {
    if (countryCode.length != 2) {
        // Only the three regional flags of [Scotland, Wales, England] are
        // recommended for general interchange by the Unicode consortium.
        switch(countryCode) {
            case 'GBSCT': return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
            case 'GBWLS': return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
            case 'GBENG': return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
            default: return null;
        }
    }
    const codePoints = countryCode.toUpperCase().split('').map(c =>  127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

type CountryLinkProps = {
    countryCode: string,
    countryName: string,
}
export function CountryLink(props: CountryLinkProps) {
    return (<>
        <Link to={getRouteForCountryCode(props.countryCode)}>
            <span className="rounded hover:ring hover:ring-slate-200 hover:bg-slate-100" >{props.countryName} {flagEmojiForCountryCode(props.countryCode)}</span>
        </Link>
    </>);
}
