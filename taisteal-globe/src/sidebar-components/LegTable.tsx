import { loadJSON, parseLegs } from 'data'
import { Leg, } from 'types'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

// TODO: this should be co-located with MAP_DATA_URL in data.ts.
const LEG_DATA_URL = window.location.protocol + '//' + window.location.hostname + '/api/get_legs';

type LegTableProps = {
    legs: Leg[],
}

export const LegTable = (props: LegTableProps) => {
    return (
        <>{props.legs.length} legs!</>
    )
}

export const AllLegTable = () => {
    const { getToken } = useAuth();
    const [legs, setLegs] = useState<Leg[]>([]);
    const [currOffset, setOffset] = useState<number>(0);
    const [currLimit] = useState<number>(15);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const getLegs = async (offset: number, limit: number) => {
        if (isLoading) { 
            console.log("getLegs() requested, but already loading.");
            return;
        }
        setIsLoading(true);
        const token = await getToken();

        loadJSON(LEG_DATA_URL + "?key=whiskey&offset=" + offset + "&limit=" + limit, (data) => {
            setLegs(parseLegs(data));
            setIsLoading(false);
        });
    }

    useEffect(() => {
        getLegs(currOffset, currLimit);
        return () => {};
    }, [currOffset, currLimit]);

    return (
        <>
            paginated legs table, with a big button to add a new leg ?
            { isLoading && "loading" }
            { legs.length > 0 && <LegTable legs={legs} />}
        </>
    );
}
