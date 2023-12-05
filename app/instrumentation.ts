export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { shutdown } = await import('./lib/db');
    process.on('SIGTERM', async () => {
      console.log('The service is about to shut down!');
      await shutdown();

      process.exit(0);
    });
  }
}
