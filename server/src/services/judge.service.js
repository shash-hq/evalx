// DEVELOPMENT MOCK MODE (Bypassing M-Series Mac Docker Limitations)
export const runTestCase = async ({ language, code, input, expectedOutput }) => {
  console.log(`--- MOCK JUDGE: Simulating execution for ${language} ---`);
  
  // Fake a 1-second delay so it feels like real execution in the UI/Logs
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Always returns 'accepted' to help us test the Leaderboard & Sockets
  return {
    passed: true,
    status: 'accepted',
    stdout: expectedOutput, 
    stderr: '',
    time: 42,
    memory: 1024,
  };
};

export const runOnPiston = async () => { return {}; }; // Unused in mock
