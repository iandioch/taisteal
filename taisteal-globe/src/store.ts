import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Leg, Visit } from 'types'

interface LegState {
    legs: Leg[]
    stats: {
        totalCount: number,
        totalDistance: number, /* km */
    }
};

const initialLegState: LegState = {
    legs: [],
    stats: {
        totalCount: 0,
        totalDistance: 0,
    }
}

const legSlice = createSlice({
    name: 'legs',
    initialState: initialLegState,
    reducers: {
        addLeg: (state, action: PayloadAction<Leg>) => {
            state.legs.push(action.payload);
            const leg = action.payload;
            state.stats.totalCount += leg.count;
            state.stats.totalDistance += leg.count * leg.distance;
        },
        addLegs: (state, action: PayloadAction<Leg[]>) => {
            state.legs = [...state.legs, ...action.payload];

            for (const leg of action.payload) {
                state.stats.totalCount += leg.count;
                state.stats.totalDistance += leg.count * leg.distance;
            }
        }
    },
});

interface VisitState {
    visits: Visit[],
    longestVisit: Visit|null,
    stats: {
        numCountries: number,
    }
}

const initialVisitState: VisitState = {
    visits: [],
    longestVisit: null,
    stats: {
        numCountries: 0,
    }
}

function getLongestVisit(visits: Visit[]): Visit|null { 
    let v = null;
    let vh = 0;
    for (let visit of visits) {
        if (visit.hours >= vh) {
            v = visit;
            vh = visit.hours;
        }
    }
    return v;
}

function computeStats(visits: Visit[]): VisitState['stats'] {
    let countries = new Set<string>();
    for (const visit of visits) {
        countries.add(visit.location.countryCode);
    }
    return {
        numCountries: countries.size,
    }
}

const visitSlice = createSlice({
    name: 'visits',
    initialState: initialVisitState,
    reducers: {
        addVisit: (state, action: PayloadAction<Visit>) => {
            state.visits.push(action.payload);
            if ((!state.longestVisit) || 
                (action.payload.hours > state.longestVisit.hours)) {
                state.longestVisit = action.payload;
            }

            state.stats = computeStats(state.visits);
        },
        addVisits: (state, action: PayloadAction<Visit[]>) => {
            state.visits = [...state.visits, ...action.payload];
            state.longestVisit = getLongestVisit(state.visits);
            state.stats = computeStats(state.visits);
        },
    },
});

const store = configureStore({
    reducer: {
        legs: legSlice.reducer,
        visits: visitSlice.reducer
    }
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export { legSlice, visitSlice }
export default store;
