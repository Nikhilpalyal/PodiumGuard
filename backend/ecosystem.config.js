module.exports = {
  apps: [
    {
      name: "podiumguard-backend",
      script: "src/server.js",
      cwd: "./",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 5000
      },
      log_file: "logs/combined.log",
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      merge_logs: true,
      max_memory_restart: "1G",
      node_args: "--max-old-space-size=1024"
    },
    {
      name: "podiumguard-ai-engine",
      script: "app.py",
      cwd: "./ai-engine",
      interpreter: "python3",
      instances: 1,
      exec_mode: "fork",
      env: {
        FLASK_ENV: "production",
        FLASK_APP: "app.py"
      },
      env_development: {
        FLASK_ENV: "development",
        FLASK_APP: "app.py"
      },
      log_file: "logs/ai-combined.log",
      out_file: "logs/ai-out.log",
      error_file: "logs/ai-error.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      merge_logs: true,
      max_memory_restart: "512M"
    }
  ]
};