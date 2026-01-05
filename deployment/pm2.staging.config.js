module.exports = {
  apps: [{
    name: 'gcgc-tms-staging',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/pm2/gcgc-tms-staging-error.log',
    out_file: '/var/log/pm2/gcgc-tms-staging-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
