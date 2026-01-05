module.exports = {
  apps: [{
    name: 'gcgc-tms-production',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/gcgc-tms-production-error.log',
    out_file: '/var/log/pm2/gcgc-tms-production-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
