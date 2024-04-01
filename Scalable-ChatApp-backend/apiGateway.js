const express = require('express');
const httpProxy = require('http-proxy');

const app = express();
const proxy = httpProxy.createProxyServer();

const socketServicePort = 4001; 
const fetchServicePort = 4002; 

app.get('/api/chat/:username', (req, res) => {
    proxy.web(req, res, { target: `http://fetchService:${fetchServicePort}` }); 
});

app.use((req, res) => {
    proxy.web(req, res, { target: `http://socketservice:${socketServicePort}` });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
