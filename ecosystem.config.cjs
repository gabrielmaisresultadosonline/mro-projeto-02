/**
 * PM2 — mantém o backend próprio no ar após reboots e falhas.
 *
 * Uma instância só: o host de funções guarda em memória quais processos Deno
 * estão rodando, e várias instâncias duplicariam esses processos.
 */
module.exports = {
  apps: [
    {
      name: "mro-api",
      cwd: __dirname + "/server",
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "1G",
      // Dá tempo para chamadas em andamento terminarem e para o handler
      // SIGTERM encerrar os processos Deno filhos antes de um SIGKILL.
      kill_timeout: 70000,
      env: {
        NODE_ENV: "production",
        // PM2 iniciado pelo systemd costuma herdar um PATH mínimo. As funções
        // Deno precisam enxergar o binário instalado pelo deploy.
        PATH: `/usr/local/bin:${process.env.HOME || "/root"}/.deno/bin:${process.env.PATH || "/usr/bin:/bin"}`,
      },
      error_file: "/var/log/mro/api-error.log",
      out_file: "/var/log/mro/api-out.log",
      time: true,
    },
  ],
};
