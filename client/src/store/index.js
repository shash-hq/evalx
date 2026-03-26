import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import contestReducer from './slices/contestSlice.js';
import submissionReducer from './slices/submissionSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contests: contestReducer,
    submissions: submissionReducer,
  },
});
