module.exports = {
    apps: [
        {
            name: 'chartdb-collab',
            script: './collab-server.cjs',
            env: {
                PORT: 1234,
                HOST: '0.0.0.0',
                YPERSISTENCE: './collab-data',
            },
        },
        {
            name: 'chartdb-app',
            script: 'npm',
            args: 'run dev -- --host',
        },
    ],
};
