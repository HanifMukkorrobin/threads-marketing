module.exports = {
  apps: [
    {
      name: 'threads-marketing',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4000 -H 0.0.0.0',
      cwd: '/home/ubuntu/project/threads-marketing',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
        DATABASE_URL: 'file:./prod.db',
      },
    },
  ],
};
