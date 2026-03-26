import { createSlice } from '@reduxjs/toolkit';

const submissionSlice = createSlice({
  name: 'submissions',
  initialState: {
    current: null,
    history: [],
    pending: false,
  },
  reducers: {
    setSubmissionPending: (state, action) => {
      state.current = { submissionId: action.payload, status: 'queued' };
      state.pending = true;
    },
    setSubmissionResult: (state, action) => {
      state.current = action.payload;
      state.pending = false;
      state.history.unshift(action.payload);
    },
    clearSubmission: (state) => {
      state.current = null;
      state.pending = false;
    },
  },
});

export const { setSubmissionPending, setSubmissionResult, clearSubmission } = submissionSlice.actions;
export default submissionSlice.reducer;
