// PM2 Ecosystem Configuration
// This file is used for PM2 process management in production

module.exports = {
  apps: [
    {
      name: 'linkedin-pdf-downloader',
      script: './server.js',
      
      // Instances
      instances: 1, // Single instance (Puppeteer doesn't scale well horizontally)
      exec_mode: 'fork', // Use fork mode for single instance
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Restart behavior
      autorestart: true,
      watch: false, // Don't watch in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // Prefix logs with timestamps
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced features
      min_uptime: '10s', // Min uptime before considering app as started
      max_restarts: 10, // Max number of unstable restarts
      restart_delay: 4000, // Delay between automatic restarts (4 seconds)
      
      // Process management
      kill_timeout: 5000, // Time to wait for graceful shutdown
      wait_ready: true, // Wait for process.send('ready')
      listen_timeout: 10000, // Time to wait for listen event
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      
      // Source map support (for better error traces)
      source_map_support: true,
      
      // Shutdown signal
      kill_signal: 'SIGINT',
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Post-deploy commands (optional)
      post_update: ['npm install', 'echo "Application updated"'],
      
      // Environment-specific overrides
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      }
    }
  ],

  // Deployment configuration (optional - for automated deployments)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/linkedin-pdf-downloader.git',
      path: '/opt/linkedin-pdf-downloader',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production server..."'
    },
    staging: {
      user: 'ubuntu',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/linkedin-pdf-downloader.git',
      path: '/opt/linkedin-pdf-downloader-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
