import {configureStore, createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit'
import {Leg} from 'types'

const addLegs = createAsyncThunk('legs/addLegs', (legs: Leg[]) => {
    return legs;
});

interface LegState {
    legs: Leg[]
};

const initialLegState: LegState = {
    legs: [],
}

const legSlice = createSlice({
    name: 'legs',
    initialState: initialLegState,
    reducers: {
        addLeg: (state, action: PayloadAction<Leg>) => {
            state.legs.push(action.payload);
        },
        addLegs: (state, action: PayloadAction<Leg[]>) => {
            state.legs = [...state.legs, ...action.payload];
        }
    },
    extraReducers: (builder) => {
        builder.addCase(addLegs.fulfilled, (state, action: PayloadAction<Leg[]>) => {
            state.legs = [...state.legs, ...action.payload];
        });
    }
});

const store = configureStore({
    reducer: {
        legs: legSlice.reducer
    }
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export {addLegs, legSlice}
export default store;
