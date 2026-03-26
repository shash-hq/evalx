import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

export const fetchContests = createAsyncThunk(
  'contests/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/contests', { params });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

const contestSlice = createSlice({
  name: 'contests',
  initialState: {
    list: [],
    pagination: {},
    loading: false,
    error: null,
  },
  reducers: {
    updateContestStatus: (state, action) => {
      const { contestId, status } = action.payload;
      const c = state.list.find((c) => c._id === contestId);
      if (c) c.status = status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContests.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchContests.fulfilled, (state, action) => {
        state.list = action.payload.contests;
        state.pagination = action.payload.pagination;
        state.loading = false;
      })
      .addCase(fetchContests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { updateContestStatus } = contestSlice.actions;
export default contestSlice.reducer;
