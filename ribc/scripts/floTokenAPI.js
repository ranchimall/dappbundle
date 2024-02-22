(function (EXPORTS) { //floTokenAPI v1.2.0
    /* Token Operator to send/receive tokens via blockchain using API calls*/
    'use strict';
    const tokenAPI = EXPORTS;

    const DEFAULT = {
        apiURL: [floGlobals.tokenURL || "https://ranchimallflo.ranchimall.net/"],
        currency: floGlobals.currency || "rupee"
    }

    const torExitNodes = new Set(["185.241.208.232", "194.26.192.64", "171.25.193.25", "80.67.167.81", "192.42.116.187", "198.98.51.189", "89.58.26.216", "109.70.100.4", "149.56.22.133", "5.45.102.93", "178.17.174.14", "192.42.116.196", "185.220.101.4", "45.141.215.62", "94.102.51.15", "192.42.116.213", "107.189.28.166", "185.241.208.243", "45.141.215.80", "193.26.115.61", "192.42.116.175", "149.56.44.47", "107.189.13.91", "87.118.116.103", "178.17.171.102", "185.243.218.110", "192.42.116.208", "89.58.41.156", "2.58.56.43", "104.192.1.138", "45.95.169.184", "107.189.8.56", "176.58.121.177", "185.220.101.31", "45.141.215.200", "109.70.100.1", "185.244.192.175", "185.129.61.2", "144.172.118.41", "192.42.116.184", "45.151.167.10", "185.220.101.27", "91.203.144.194", "45.141.215.88", "179.43.182.232", "185.220.101.5", "109.70.100.2", "107.189.14.4", "94.16.116.81", "185.220.101.8", "185.220.101.12", "88.80.20.86", "23.154.177.15", "45.141.215.56", "5.42.66.6", "23.129.64.225", "104.244.75.74", "45.95.169.228", "37.187.5.192", "45.141.215.169", "109.70.100.66", "45.79.144.222", "185.227.68.78", "179.43.159.199", "2.57.122.246", "192.42.116.201", "185.220.102.248", "195.176.3.23", "45.138.16.42", "216.73.159.75", "185.165.169.239", "23.129.64.213", "109.70.100.6", "45.80.158.27", "45.138.16.240", "178.20.55.16", "192.42.116.173", "51.15.249.160", "192.42.116.200", "185.220.102.254", "45.141.215.63", "193.218.118.151", "192.42.116.211", "185.100.85.24", "185.195.71.12", "107.189.8.181", "193.189.100.199", "109.70.100.69", "185.100.87.250", "31.220.93.201", "89.236.112.100", "45.141.215.90", "185.35.202.222", "109.70.100.65", "95.142.161.63", "192.42.116.181", "192.42.116.23", "194.26.192.77", "193.189.100.198", "180.150.226.99", "23.129.64.227", "107.189.4.23", "45.141.215.235", "185.220.102.252", "109.70.100.67", "185.220.100.255", "185.220.101.21", "185.100.85.22", "128.31.0.13", "46.182.21.248", "192.42.116.174", "185.241.208.115", "185.220.101.1", "192.42.116.202", "45.141.215.97", "185.243.218.204", "78.142.18.219", "192.42.116.192", "190.120.229.98", "192.42.116.177", "45.138.16.113", "192.42.116.212", "185.220.101.3", "45.138.16.222", "5.42.80.232", "87.118.122.51", "107.189.11.166", "185.220.102.245", "185.220.102.251", "46.182.21.250", "5.255.103.235", "185.243.218.89", "185.193.52.180", "185.220.101.24", "2.57.122.215", "45.15.157.177", "185.220.100.253", "37.48.120.64", "204.8.156.142", "192.42.116.179", "185.220.100.240", "185.241.208.236", "185.195.71.244", "193.105.134.155", "51.15.59.15", "185.100.85.23", "45.151.167.11", "82.197.182.161", "192.42.116.191", "27.255.75.198", "171.25.193.79", "45.95.169.255", "45.138.16.230", "107.189.29.103", "163.172.213.212", "95.143.193.125", "23.154.177.7", "185.220.101.23", "195.176.3.24", "107.189.1.9", "192.42.116.182", "23.137.249.240", "192.42.116.189", "23.129.64.146", "45.138.16.107", "107.189.5.121", "107.189.30.236", "94.16.121.91", "109.70.100.70", "185.254.196.141", "194.15.112.133", "192.42.116.180", "173.249.57.253", "185.220.102.250", "185.100.85.25", "185.220.101.13", "185.220.101.25", "192.42.116.199", "23.154.177.2", "107.189.31.232", "45.141.215.81", "192.42.116.220", "185.67.82.114", "45.141.215.114", "185.243.218.61", "107.189.13.184", "107.189.10.141", "104.244.79.61", "185.106.94.195", "176.126.253.190", "23.154.177.22", "192.42.116.210", "185.220.102.249", "23.184.48.127", "192.42.116.218", "91.208.75.4", "192.42.116.178", "178.175.148.209", "208.109.36.224", "23.137.251.61", "94.142.241.194", "162.251.5.152", "23.154.177.4", "45.138.16.76", "45.9.150.103", "213.252.140.118", "185.243.218.95", "45.134.225.36", "109.70.100.5", "185.243.218.202", "185.220.101.19", "192.42.116.176", "109.70.100.71", "45.151.167.13", "185.220.102.4", "185.220.102.7", "104.244.79.50", "178.17.174.198", "199.195.249.214", "66.146.193.33", "107.189.8.238", "139.99.8.57", "45.141.215.95", "192.42.116.219", "114.199.75.111", "185.220.100.242", "5.42.80.234", "173.237.206.68", "139.99.172.11", "23.129.64.143", "80.241.60.207", "192.42.116.194", "45.95.169.226", "185.220.102.8", "109.70.100.3", "179.43.159.200", "192.42.116.217", "185.220.101.6", "198.98.50.199", "185.100.87.192", "193.189.100.202", "163.172.45.102", "185.220.101.0", "107.189.8.133", "185.129.61.6", "104.244.78.233", "192.42.116.15", "192.42.116.195", "45.141.215.110", "193.189.100.203", "77.48.28.237", "104.244.79.232", "193.26.115.43", "199.195.250.165", "190.211.254.97", "45.141.215.61", "185.220.101.17", "192.42.116.203", "185.220.102.247", "91.132.144.59", "185.141.147.129", "23.129.64.149", "185.183.157.214", "95.211.244.28", "192.42.116.188", "188.214.104.21", "192.42.116.186", "192.42.116.197", "107.189.13.247", "212.73.134.204", "185.235.146.29", "188.68.49.235", "92.205.237.227", "23.154.177.12", "199.195.253.180", "171.25.193.234", "185.241.208.71", "96.66.15.152", "94.16.121.226", "204.85.191.9", "91.210.59.57", "5.255.115.42", "185.220.103.113", "216.239.90.19", "77.91.87.79", "192.42.116.216", "23.154.177.23", "192.42.116.198", "173.255.255.215", "144.217.80.80", "107.189.10.175", "45.95.169.227", "103.251.167.20", "185.220.101.30", "5.255.125.196", "198.98.48.192", "185.220.102.242", "23.154.177.18", "185.86.148.90", "185.142.239.49", "185.220.101.2", "5.255.100.219", "107.189.5.7", "199.195.251.119", "185.220.101.10", "92.246.84.133", "66.220.242.222", "184.105.48.40", "23.129.64.133", "185.130.44.108", "192.42.116.20", "185.181.61.115", "192.42.116.19", "149.202.79.129", "146.59.35.38", "23.154.177.20", "185.191.204.254", "23.154.177.3", "185.233.100.23", "23.154.177.19", "45.92.1.74", "107.189.31.225", "89.58.18.10", "138.59.18.110", "185.246.188.73", "192.42.116.221", "104.244.77.192", "192.42.116.214", "178.170.37.11", "188.68.41.191", "192.42.116.183", "185.220.103.115", "178.175.135.7", "209.141.51.30", "141.98.11.62", "171.25.193.235", "23.137.249.143", "179.43.159.197", "192.99.168.180", "185.220.101.11", "185.243.218.41", "89.234.157.254", "47.243.74.136", "107.189.28.199", "185.129.61.9", "185.220.101.28", "185.220.101.29", "5.255.99.5", "179.43.182.58", "185.129.61.3", "23.129.64.135", "107.189.30.69", "51.15.227.109", "185.207.107.216", "185.129.61.129", "185.100.87.41", "23.129.64.145", "179.43.159.201", "23.129.64.224", "192.42.116.28", "93.99.104.194", "185.244.192.184", "45.95.169.223", "104.244.73.43", "185.56.83.83", "87.120.254.48", "185.185.170.27", "195.88.74.206", "107.174.138.172", "109.70.100.68", "23.129.64.139", "94.230.208.147", "77.91.85.147", "77.81.247.72", "2.58.56.220", "185.220.103.7", "149.202.79.101", "5.255.104.202", "178.175.148.195", "83.96.213.63", "185.100.87.174", "79.137.195.103", "185.220.101.20", "107.189.3.11", "185.220.101.22", "185.220.101.7", "217.12.221.131", "179.43.159.196", "45.95.169.230", "107.189.1.160", "208.109.215.188", "171.25.193.78", "204.194.29.4", "104.244.77.80", "162.247.72.199", "89.58.52.25", "192.42.116.209", "217.146.2.41", "185.220.103.117", "23.154.177.10", "91.208.75.3", "94.230.208.148", "95.128.43.164", "171.25.193.20", "102.130.113.9", "91.92.109.43", "107.189.7.144", "185.220.102.240", "5.255.124.150", "198.98.60.158", "185.227.134.106", "193.233.233.221", "71.19.144.106", "185.84.31.254", "23.129.64.132", "62.171.137.169", "193.189.100.196", "185.220.101.18", "107.189.12.3", "91.208.75.178", "193.35.18.49", "185.246.188.74", "45.132.246.245", "209.141.55.26", "198.98.48.20", "185.129.61.1", "108.61.189.136", "185.220.102.243", "107.189.1.96", "185.100.87.136", "213.95.149.22", "23.129.64.217", "192.42.116.185", "5.45.104.176", "192.42.116.193", "23.154.177.16", "198.98.49.203", "171.25.193.77", "91.208.75.153", "162.247.74.216", "179.43.159.194", "54.36.108.162", "198.98.48.33", "188.68.52.231", "185.220.100.252", "205.185.124.193", "104.244.73.190", "185.100.87.139", "23.154.177.25", "77.105.146.42", "79.137.202.92", "51.38.81.135", "87.118.116.90", "23.129.64.134", "185.246.188.67", "185.129.62.62", "185.220.100.241", "82.221.131.71", "209.141.59.116", "194.195.120.132", "185.207.107.130", "178.218.144.99", "172.104.243.155", "93.99.104.128", "87.118.122.30", "185.100.87.253", "51.195.91.124", "104.192.3.74", "185.252.232.218", "23.129.64.141", "5.196.95.34", "185.220.102.6", "23.184.48.128", "193.239.232.102", "185.220.101.16", "91.203.145.116", "185.129.61.4", "23.129.64.147", "37.228.129.63", "45.151.167.12", "93.95.228.205", "185.220.102.244", "209.141.54.203", "93.95.230.165", "94.142.244.16", "162.247.72.192", "185.146.232.234", "81.16.33.42", "107.189.30.86", "51.81.222.62", "23.154.177.5", "77.220.196.253", "72.167.47.69", "185.220.101.26", "104.219.236.100", "192.42.116.204", "185.246.128.161", "200.122.181.2", "199.195.253.247", "109.201.133.100", "142.44.234.69", "89.147.110.202", "89.185.85.140", "104.244.79.44", "5.2.79.179", "23.129.64.130", "104.244.78.187", "23.154.177.13", "5.255.97.221", "92.205.129.119", "80.82.78.14", "23.154.177.8", "51.38.113.118", "45.61.184.205", "107.189.31.134", "185.220.103.114", "179.48.251.188", "135.125.205.25", "198.98.54.49", "193.189.100.205", "185.220.102.253", "45.79.50.161", "202.69.76.36", "79.137.198.213", "46.166.139.111", "5.255.111.64", "51.89.138.51", "216.73.159.101", "166.70.207.2", "96.27.198.133", "194.15.115.212", "46.234.47.105", "146.59.35.246", "23.137.248.100", "185.220.102.241", "107.189.14.43", "212.95.50.77", "128.127.180.156", "80.67.172.162", "185.129.61.5", "185.129.61.10", "23.129.64.214", "185.220.100.254", "160.119.249.240", "185.243.218.46", "185.220.102.246", "104.244.74.97", "23.129.64.228", "23.129.64.218", "185.220.100.243", "54.36.101.21", "5.255.99.124", "107.189.13.253", "130.149.80.199", "171.25.193.80", "144.24.197.112", "199.195.251.78", "23.129.64.223", "195.80.151.30", "185.7.33.146", "107.189.4.12", "45.95.169.229", "107.189.6.124", "46.38.255.27", "107.189.8.226", "143.42.199.223", "103.251.167.10", "185.34.33.2", "5.255.98.23", "74.82.47.194", "194.163.157.49", "192.42.116.215", "185.220.101.14", "194.15.113.118", "89.147.108.62", "185.220.101.15", "185.42.170.203", "23.154.177.6", "162.247.74.27", "199.195.253.124", "193.189.100.201", "62.182.84.146", "191.101.217.24", "23.129.64.229", "85.93.218.204", "178.17.174.164", "205.185.117.149", "193.218.118.133", "23.154.177.21", "5.255.101.10", "82.221.131.5", "193.189.100.204", "103.196.37.111", "103.109.101.105", "192.42.116.18", "23.129.64.226", "107.189.13.251", "45.56.81.190", "192.42.116.13", "107.189.11.111", "198.46.166.157", "185.220.103.119", "54.38.183.101", "77.68.20.217", "185.220.101.36", "103.236.201.88", "162.247.74.213", "185.129.61.8", "89.147.110.154", "45.95.169.225", "141.239.149.94", "82.221.128.191", "72.14.179.10", "46.232.251.191", "23.129.64.215", "162.247.74.7", "23.154.177.14", "89.147.109.226", "193.41.226.117", "89.147.108.209", "23.129.64.137", "93.123.12.112", "185.14.97.37", "103.163.218.11", "23.129.64.131", "23.129.64.142", "23.137.249.185", "89.58.41.251", "185.220.101.9", "202.182.99.129", "205.185.119.35", "193.189.100.194", "204.85.191.8", "185.56.171.94", "23.129.64.144", "102.130.127.117", "192.42.116.24", "179.43.159.198", "185.38.175.133", "185.220.101.39", "193.168.143.129", "5.255.127.222", "95.211.210.103", "185.220.103.116", "23.129.64.211", "23.129.64.220", "185.113.128.30", "151.80.148.159", "192.99.149.111", "23.129.64.210", "37.228.129.128", "91.208.75.239", "185.220.103.120", "185.165.171.84", "193.105.134.150", "209.141.46.203", "209.141.50.178", "104.244.74.23", "45.95.169.224", "23.129.64.140", "176.118.193.33", "204.85.191.7", "104.244.73.193", "162.247.74.204", "91.208.75.156", "205.185.116.34", "125.212.241.131", "5.2.72.110", "179.43.159.195", "185.154.110.142", "91.206.26.26", "45.79.177.21", "23.154.177.9", "193.189.100.197", "46.165.243.36", "107.189.2.108", "23.154.177.17", "23.129.64.148", "5.45.98.162", "5.255.101.131", "23.129.64.136", "107.189.31.33", "185.82.219.109", "104.244.73.136", "185.129.61.7", "5.255.115.58", "23.154.177.24", "165.73.242.163", "193.189.100.200", "192.46.227.185", "5.196.8.113", "77.91.86.95", "85.209.176.103", "23.137.249.8", "5.255.98.151", "23.129.64.221", "23.129.64.219", "23.129.64.216", "185.243.218.35", "104.244.77.208", "94.228.169.70", "51.75.64.23", "176.58.100.98", "23.154.177.11", "23.129.64.138", "143.42.110.237", "94.16.112.22", "144.172.118.4", "185.130.47.58", "185.154.110.17", "104.244.72.132", "5.2.79.190", "23.129.64.212", "109.169.33.163", "5.2.67.226", "109.69.67.17", "108.181.27.205", "5.255.103.190", "107.189.14.106", "5.255.99.147", "193.189.100.206", "193.218.118.182", "185.181.61.142", "23.129.64.222", "193.35.18.77", "185.100.86.128", "91.203.5.118", "83.97.20.77", "45.138.16.203", "2.57.122.58", "185.181.61.18", "195.176.3.19", "195.176.3.20", "198.58.107.53", "138.128.222.68", "118.163.74.160", "185.241.208.54", "38.97.116.244", "104.244.77.79", "103.253.24.18", "185.225.69.203", "162.247.74.206", "79.124.8.241", "91.203.5.115", "144.172.118.102", "144.172.118.124", "185.225.69.232", "163.5.143.76", "144.172.118.51", "178.20.55.182", "109.104.153.22", "193.233.133.109", "51.158.115.62", "92.205.31.137", "185.193.158.134", "217.12.215.167", "45.15.158.39", "185.174.136.114", "91.219.239.166", "91.219.237.56", "51.159.211.57", "192.210.255.181", "185.170.114.25", "205.185.123.93", "205.185.121.170", "107.189.13.180", "104.244.78.162", "104.244.76.170", "104.244.74.57", "195.160.220.104", "31.220.98.139", "158.220.92.203", "23.184.48.101", "178.31.22.116", "79.102.34.63", "185.220.103.5", "179.43.128.16", "45.128.133.242", "185.220.103.118", "185.100.85.132", "107.189.7.48", "5.135.174.211", "45.8.22.207", "185.220.101.159", "185.220.101.141", "185.220.101.134", "185.220.101.147", "185.220.101.153", "185.220.101.145", "185.220.101.158", "185.220.101.160", "185.220.101.137", "185.220.101.140", "185.220.101.132", "185.220.101.157", "185.220.101.150", "185.220.101.143", "158.69.201.47", "107.189.1.175", "176.58.89.182", "185.220.101.138", "82.118.242.158", "217.170.201.71", "193.189.100.195", "144.172.118.48", "185.220.101.135", "185.220.101.191", "185.220.101.136", "185.220.101.179", "185.220.101.170", "185.220.101.149", "185.220.101.173", "185.220.101.171", "185.220.101.161", "185.220.101.163", "185.220.101.152", "185.220.101.162", "185.220.101.176", "185.220.101.188", "185.82.127.128", "85.235.145.205", "172.81.131.139", "5.255.100.26", "62.63.244.7", "104.219.236.101", "23.137.248.139", "185.241.208.204", "45.141.215.111", "185.241.208.202", "45.141.215.21", "45.61.185.172", "185.241.208.206", "205.185.113.180", "93.242.68.75", "185.220.100.248", "185.220.100.251", "185.220.100.247", "185.220.100.245", "185.220.100.246", "185.220.100.249", "185.220.100.250", "185.220.100.244", "77.72.85.30", "51.222.142.67", "107.172.31.165", "107.174.231.197", "198.144.178.163", "23.137.250.34", "107.172.13.143", "107.172.31.146", "173.232.195.137", "50.3.182.156", "173.232.195.144", "173.232.195.146", "172.81.131.168", "172.81.131.84", "77.48.28.239", "172.81.131.156", "185.183.159.40", "196.189.30.114", "107.189.8.5", "185.220.101.168", "185.220.101.165", "185.220.101.142", "185.220.101.167", "185.220.101.166", "185.220.101.169", "77.48.28.193", "37.228.129.5", "144.172.73.11", "107.189.14.57", "84.16.224.227", "185.220.103.4", "162.247.74.202", "185.220.103.6", "162.247.74.200", "185.220.103.9", "185.220.103.8", "154.12.254.57", "94.103.124.184", "185.220.101.189", "67.219.109.141", "185.220.101.187", "185.220.101.186", "185.220.101.183", "50.3.182.133", "185.220.101.182", "185.220.101.184", "188.172.229.15", "89.58.18.210", "45.9.150.130", "190.103.179.98", "108.181.124.143", "178.218.144.51", "185.220.101.66", "185.220.101.70", "185.220.101.68", "185.220.101.77", "185.220.101.78", "185.220.101.81", "185.220.101.71", "185.220.101.83", "185.220.101.75", "185.220.101.85", "185.220.101.73", "185.220.101.82", "185.220.101.65", "185.220.101.84", "185.220.101.76", "185.220.101.86", "185.220.101.69", "185.220.101.67", "185.220.101.80", "185.220.101.64", "185.220.101.74", "185.220.101.79", "185.220.101.72", "185.220.101.87", "199.249.230.120", "184.75.221.171", "5.182.86.212", "104.244.72.115", "198.23.133.132", "23.94.36.142", "198.98.60.90", "84.19.182.20", "45.9.148.219", "217.160.88.146", "104.219.232.126", "45.139.122.241", "199.195.253.156", "75.119.142.240", "199.249.230.103", "199.249.230.104", "199.249.230.116", "199.249.230.101", "199.249.230.119", "199.249.230.100", "199.249.230.102", "199.249.230.109", "199.249.230.81", "199.249.230.176", "199.249.230.79", "199.249.230.167", "199.249.230.88", "199.249.230.188", "199.249.230.80", "199.249.230.144", "199.249.230.78", "199.249.230.111", "199.249.230.68", "199.249.230.180", "199.249.230.150", "199.249.230.70", "199.249.230.77", "199.249.230.112", "199.249.230.65", "199.249.230.183", "199.249.230.189", "199.249.230.178", "199.249.230.145", "199.249.230.115", "199.249.230.147", "199.249.230.66", "199.249.230.140", "199.249.230.114", "199.249.230.170", "199.249.230.71", "199.249.230.148", "199.249.230.67", "199.249.230.75", "199.249.230.146", "199.249.230.151", "199.249.230.187", "199.249.230.174", "199.249.230.143", "199.249.230.118", "199.249.230.64", "199.249.230.85", "199.249.230.113", "199.249.230.155", "199.249.230.153", "199.249.230.89", "45.77.67.251", "123.253.35.32", "45.83.104.137", "94.32.66.15", "185.220.101.181", "185.220.101.178", "185.220.101.177", "185.220.101.175", "185.220.101.172", "94.16.116.86", "5.181.80.107", "198.50.207.20", "107.189.7.168", "85.215.76.62", "185.247.184.105", "178.236.247.122", "109.107.190.171", "193.233.233.124", "193.218.118.188", "2.58.95.45", "45.154.98.102", "92.205.185.52", "92.205.163.226", "185.217.125.210", "5.255.118.104", "212.69.167.80", "23.137.249.227", "5.255.118.244", "71.19.148.129", "143.42.114.46", "45.33.15.243", "104.237.158.32", "172.232.161.205", "172.232.161.206", "74.207.248.172", "172.233.209.179", "45.66.35.21", "45.66.35.35", "45.66.35.10", "45.66.35.20", "45.66.35.22", "51.210.138.64", "130.204.161.3", "175.214.127.6", "31.220.85.162", "198.96.155.3", "50.118.225.160", "45.135.132.20", "23.152.24.77", "45.95.169.99", "94.75.225.81", "37.228.129.131", "23.137.249.62", "103.172.134.26", "199.249.230.121", "191.252.111.55", "35.0.127.52", "185.129.62.63", "23.94.211.25", "185.220.101.139", "185.220.101.144", "185.220.101.130", "185.220.101.156", "185.220.101.128", "185.220.101.131", "185.220.101.154", "185.220.101.164", "185.220.101.180", "185.220.101.155", "185.220.101.133", "185.220.101.190", "185.220.101.151", "185.220.101.174", "185.220.101.148", "185.220.101.129", "185.220.101.185", "37.221.208.68", "87.120.254.132", "5.255.106.9", "45.15.158.165", "193.35.18.105", "178.17.170.23", "185.146.232.243", "194.163.178.164", "94.140.115.63", "37.228.129.24", "81.0.248.210", "193.35.18.98", "45.128.232.170", "193.35.18.96", "45.128.232.102", "193.35.18.94", "193.35.18.95", "149.102.128.242", "89.187.143.31", "193.239.232.228", "103.208.86.5", "193.35.18.120", "185.130.44.43", "185.219.142.126", "37.1.201.144", "5.255.99.108", "85.204.116.211", "130.193.10.21", "130.193.15.79", "84.239.46.144", "178.218.162.62", "199.249.230.122", "199.249.230.84", "45.141.202.164", "199.249.230.74", "148.113.2.107", "199.249.230.105", "199.249.230.73", "199.249.230.110", "199.249.230.72", "199.249.230.86", "103.129.222.46", "64.5.123.66", "185.239.71.160", "5.42.80.233", "5.42.80.235", "200.25.27.112", "46.226.107.206", "103.106.3.175", "96.42.26.63", "192.42.116.26", "192.42.116.17", "192.42.116.14", "192.42.116.22", "192.42.116.25", "192.42.116.27", "74.208.106.128", "213.232.235.83", "91.208.197.144", "51.195.166.174", "198.98.53.136", "157.143.80.38", "198.50.128.237", "193.233.232.86", "144.126.152.77", "158.220.80.216", "154.16.116.61", "45.88.223.151", "144.126.132.30", "89.147.110.214", "89.163.155.136", "107.189.13.93", "77.232.143.255", "77.232.143.243", "77.232.143.248", "94.228.163.25", "199.249.230.186", "199.249.230.177", "199.249.230.159", "199.249.230.161", "199.249.230.163", "199.249.230.149", "199.249.230.154", "199.249.230.164", "199.249.230.160", "199.249.230.173", "199.249.230.158", "199.249.230.157", "199.249.230.108", "199.249.230.83", "199.249.230.168", "199.249.230.82", "199.249.230.166", "199.249.230.123", "199.249.230.106", "199.249.230.76", "199.249.230.117", "199.249.230.169", "199.249.230.171", "199.249.230.175", "199.249.230.107", "199.249.230.152", "199.249.230.162", "2.58.95.53", "199.249.230.69", "2.58.95.47", "2.58.95.59", "2.58.95.56", "178.175.142.26", "199.249.230.156", "199.249.230.87", "103.28.52.93", "185.107.70.56", "89.147.108.56", "148.113.2.104", "38.242.203.135", "162.247.74.201", "172.232.238.10", "5.255.98.198", "5.255.98.231", "23.137.249.150", "149.102.155.205", "199.249.230.179", "199.249.230.165", "199.249.230.182", "199.249.230.184", "199.249.230.142", "136.243.147.59", "199.249.230.185", "185.220.101.89", "149.102.145.222", "185.220.101.90", "185.220.101.88", "87.118.110.27", "37.48.70.156", "185.165.190.111", "5.255.125.153", "205.185.124.176", "107.189.14.41", "93.95.228.81", "172.81.131.140", "185.38.142.4", "95.168.173.143", "178.218.144.18", "189.147.238.226", "189.147.187.10", "189.147.242.169", "104.219.236.93", "161.35.129.51", "86.104.194.13", "104.244.74.159", "185.220.101.40", "185.220.101.32", "185.220.101.38", "185.220.101.37", "185.220.101.35", "185.220.101.33", "185.220.101.34", "185.220.101.41", "185.220.101.42", "205.185.127.100", "185.220.101.57", "185.220.101.43", "185.220.101.46", "185.220.101.58", "185.220.101.61", "185.220.101.60", "185.220.101.63", "185.220.101.54", "185.220.101.52", "185.220.101.62", "185.220.101.56", "185.220.101.44", "185.220.101.49", "5.255.117.56", "185.220.101.55", "185.220.101.45", "185.220.101.53", "185.220.101.59", "185.220.101.51", "185.220.101.48", "185.220.101.47", "185.220.101.50", "95.111.238.0", "152.89.233.169", "89.147.110.82", "176.58.117.81", "23.155.8.104", "51.89.153.112", "5.61.51.143", "5.135.174.213", "37.120.166.23", "37.252.255.135", "82.153.138.48", "185.81.115.120", "45.139.122.176", "84.211.225.54", "31.220.87.46", "144.172.73.6", "51.89.200.109", "212.44.107.82", "89.147.111.124", "94.177.106.59", "94.177.106.55", "94.177.106.46", "93.95.231.88", "152.32.238.235", "74.208.96.95", "38.242.239.62", "87.118.114.44", "80.78.25.9", "185.193.125.95", "107.173.179.59", "179.43.159.78", "81.17.28.95", "45.79.129.209", "82.221.139.190", "107.189.13.254", "81.19.137.127", "149.102.129.11", "81.0.218.34", "93.90.74.31", "51.81.254.4", "109.123.231.55", "185.196.8.2", "158.220.81.45", "62.149.23.133", "158.220.81.47", "158.220.81.78", "209.141.51.180", "176.121.81.51", "178.17.170.184", "202.61.226.98", "202.139.229.157", "89.147.111.106"]);
    const checkIfTor = tokenAPI.checkIfTor = () => {
        return fetch('https://api.ipify.org?format=json').then(response => response.json())
            .then(result => {
                return torExitNodes.has(result.ip)
            }).catch(e => {
                console.error(e)
                return false
            })
    }
    let isTor = false;
    checkIfTor().then(result => {
        isTor = result
        if (isTor) {
            DEFAULT.apiURL.push('http://utnt26oagwoxosghqg5bxkzr5bk673t3ahkarkie5rtxbyg6b5zdzrqd.onion/')
        }
    });

    Object.defineProperties(tokenAPI, {
        URL: {
            get: () => DEFAULT.apiURL[0],
        },
        currency: {
            get: () => DEFAULT.currency,
            set: currency => DEFAULT.currency = currency
        }
    });

    if (floGlobals.currency) tokenAPI.currency = floGlobals.currency;

    Object.defineProperties(floGlobals, {
        currency: {
            get: () => DEFAULT.currency,
            set: currency => DEFAULT.currency = currency
        }
    });

    const fetch_api = tokenAPI.fetch = function (apicall, apiURLs = DEFAULT.apiURL) {
        return new Promise((resolve, reject) => {
            if (apiURLs.length === 0) {
                reject("No API URLs available");
                return;
            }
            const currentURL = apiURLs[0];
            console.debug(currentURL + apicall);
            fetch(currentURL + apicall).then(response => {
                if (response.ok)
                    response.json().then(data => resolve(data));
                else
                    reject(response);
            }).catch(error => {
                console.error(`Failed to fetch from ${currentURL}: ${error}`);
                // Try the next API URL recursively
                fetch_api(apicall, apiURLs.slice(1)).then(resolve).catch(reject);
            });
        });
    }

    const getBalance = tokenAPI.getBalance = function (floID, token = DEFAULT.currency) {
        return new Promise((resolve, reject) => {
            fetch_api(`api/v2/floAddressInfo/${floID}`)
                .then(result => resolve(result.floAddressBalances[token]?.balance || 0))
                .catch(error => reject(error))
        })
    }

    tokenAPI.getTx = function (txID) {
        return new Promise((resolve, reject) => {
            fetch_api(`api/v2/transactionDetails/${txID}`).then(res => {
                if (res.result === "error")
                    reject(res.description);
                else if (!res.parsedFloData)
                    reject("Data piece (parsedFloData) missing");
                else if (!res.transactionDetails)
                    reject("Data piece (transactionDetails) missing");
                else
                    resolve(res);
            }).catch(error => reject(error))
        })
    }

    tokenAPI.sendToken = function (privKey, amount, receiverID, message = "", token = DEFAULT.currency, options = {}) {
        return new Promise((resolve, reject) => {
            let senderID = floCrypto.getFloID(privKey);
            if (typeof amount !== "number" || isNaN(amount) || amount <= 0)
                return reject("Invalid amount");
            getBalance(senderID, token).then(bal => {
                if (amount > bal)
                    return reject(`Insufficient ${token}# balance`);
                floBlockchainAPI.writeData(senderID, `send ${amount} ${token}# ${message}`, privKey, receiverID, options)
                    .then(txid => resolve(txid))
                    .catch(error => reject(error))
            }).catch(error => reject(error))
        });
    }

    function sendTokens_raw(privKey, receiverID, token, amount, utxo, vout, scriptPubKey) {
        return new Promise((resolve, reject) => {
            var trx = bitjs.transaction();
            trx.addinput(utxo, vout, scriptPubKey)
            trx.addoutput(receiverID, floBlockchainAPI.sendAmt);
            trx.addflodata(`send ${amount} ${token}#`);
            var signedTxHash = trx.sign(privKey, 1);
            floBlockchainAPI.broadcastTx(signedTxHash)
                .then(txid => resolve([receiverID, txid]))
                .catch(error => reject([receiverID, error]))
        })
    }

    //bulk transfer tokens
    tokenAPI.bulkTransferTokens = function (sender, privKey, token, receivers) {
        return new Promise((resolve, reject) => {
            if (typeof receivers !== 'object')
                return reject("receivers must be object in format {receiver1: amount1, receiver2:amount2...}")

            let receiver_list = Object.keys(receivers), amount_list = Object.values(receivers);
            let invalidReceivers = receiver_list.filter(id => !floCrypto.validateFloID(id));
            let invalidAmount = amount_list.filter(val => typeof val !== 'number' || val <= 0);
            if (invalidReceivers.length)
                return reject(`Invalid receivers: ${invalidReceivers}`);
            else if (invalidAmount.length)
                return reject(`Invalid amounts: ${invalidAmount}`);

            if (receiver_list.length == 0)
                return reject("Receivers cannot be empty");

            if (receiver_list.length == 1) {
                let receiver = receiver_list[0], amount = amount_list[0];
                floTokenAPI.sendToken(privKey, amount, receiver, "", token)
                    .then(txid => resolve({ success: { [receiver]: txid } }))
                    .catch(error => reject(error))
            } else {
                //check for token balance
                floTokenAPI.getBalance(sender, token).then(token_balance => {
                    let total_token_amout = amount_list.reduce((a, e) => a + e, 0);
                    if (total_token_amout > token_balance)
                        return reject(`Insufficient ${token}# balance`);

                    //split utxos
                    floBlockchainAPI.splitUTXOs(sender, privKey, receiver_list.length).then(split_txid => {
                        //wait for the split utxo to get confirmation
                        floBlockchainAPI.waitForConfirmation(split_txid).then(split_tx => {
                            //send tokens using the split-utxo
                            var scriptPubKey = split_tx.vout[0].scriptPubKey.hex;
                            let promises = [];
                            for (let i in receiver_list)
                                promises.push(sendTokens_raw(privKey, receiver_list[i], token, amount_list[i], split_txid, i, scriptPubKey));
                            Promise.allSettled(promises).then(results => {
                                let success = Object.fromEntries(results.filter(r => r.status == 'fulfilled').map(r => r.value));
                                let failed = Object.fromEntries(results.filter(r => r.status == 'rejected').map(r => r.reason));
                                resolve({ success, failed });
                            })
                        }).catch(error => reject(error))
                    }).catch(error => reject(error))
                }).catch(error => reject(error))
            }

        })
    }

    tokenAPI.getAllTxs = function (floID, token = DEFAULT.currency) {
        return new Promise((resolve, reject) => {
            fetch_api(`api/v2/floAddressTransactions/${floID}${token ? `?token=${token}` : ''}`)
                .then(result => resolve(result))
                .catch(error => reject(error))
        })
    }

    const util = tokenAPI.util = {};

    util.parseTxData = function (txData) {
        let parsedData = {};
        for (let p in txData.parsedFloData)
            parsedData[p] = txData.parsedFloData[p];
        parsedData.sender = txData.transactionDetails.vin[0].addr;
        for (let vout of txData.transactionDetails.vout)
            if (vout.scriptPubKey.addresses[0] !== parsedData.sender)
                parsedData.receiver = vout.scriptPubKey.addresses[0];
        parsedData.time = txData.transactionDetails.time;
        return parsedData;
    }

})('object' === typeof module ? module.exports : window.floTokenAPI = {});