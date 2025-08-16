export const createAuthHandler = () => {
  return async (request: any, reply: any) => {
    // Skip authentication in development mode
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };
};