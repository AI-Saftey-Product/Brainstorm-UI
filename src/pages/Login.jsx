import React, {useState, useEffect} from 'react';
import {useNavigate, useLocation, useParams} from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    Alert,
    Snackbar,
    CircularProgress,
    Divider,
    Container, Stack, Card, CardContent, TextField,
} from '@mui/material';
import {useAppContext} from '../context/AppContext';
import {createModelAdapter} from '../services/modelAdapter';
import {saveModelConfig} from '../services/modelStorageService';
import DatasetConfigForm from "@/components/widgets/DatasetConfigForm.jsx";
import EvalConfigForm from "@/components/widgets/EvalConfigForm.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

export async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    return fetch(url, {
        ...options,
        headers,
    });
}

const EvalConfigPage = () => {
        const navigate = useNavigate();
        const location = useLocation();
        const [snackbarOpen, setSnackbarOpen] = useState(false);
        const [snackbarMessage, setSnackbarMessage] = useState('');

        const handleCloseSnackbar = () => {
            setSnackbarOpen(false);
        };

        const [logs, setLogs] = useState([]);
        const [isLoading, setIsLoading] = useState(false);

        // Check if we have a config passed in from location state (for editing)
        const {eval_id} = useParams();

        const [passedConfig, setSavedConfigs] = useState([]);
        useEffect(() => {
            if (eval_id) {
                fetchWithAuth(`${API_BASE_URL}/api/evals/get_evals?eval_id=${eval_id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                    .then(res => {
                        if (!res.ok) throw new Error("Network error");
                        return res.json();
                    })
                    .then(data => {
                        setSavedConfigs(data);
                        // console.log(data[0].results.slice(0, 2));
                        setLogs(data[0].results);
                    })
            }
        }, []); // empty dependency array = run once on mount

        // const loadLogs = () => {
        //     setIsLoading(true);
        //     setLogs(passedConfig[0].results.slice(0, 5))
        //     console.log(logs)
        //     setIsLoading(false);
        // }

        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');

        const handleLogin = async (e) => {
            e.preventDefault();
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            try {
                const res = await fetch(`${API_BASE_URL}/auth/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                if (!res.ok) throw new Error('Login failed');
                const data = await res.json();

                // Save token
                localStorage.setItem('token', data.access_token);
                setSnackbarMessage("Login Successful");
                setSnackbarOpen(true);
                navigate('/');
            } catch (err) {
                setError('Invalid credentials');
                setSnackbarMessage('Invalid credentials');
                setSnackbarOpen(true);
            }
        };
        return (
            <Container maxWidth="lg">

                <Typography
                    variant="h3"
                    component="h1"
                    sx={{mb: 4}}
                >
                    Login
                </Typography>

                <Paper sx={{p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider'}}>

                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        minHeight="50vh"
                        bgcolor="#f5f5f5"
                    >
                        <Paper elevation={3} sx={{p: 4, width: '100%', maxWidth: 400}}>
                            <Typography variant="h5" align="center" gutterBottom>
                                Login
                            </Typography>

                            {error && (
                                <Alert severity="error" sx={{mb: 2}}>
                                    {error}
                                </Alert>
                            )}

                            <form onSubmit={handleLogin}>
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="primary"
                                    type="submit"
                                    sx={{mt: 2}}
                                >
                                    Login
                                </Button>
                            </form>
                        </Paper>
                    </Box>
                    <Box sx={{mt: 4, display: 'flex', justifyContent: 'flex-end'}}>
                        {/*<Button*/}
                        {/*    variant="contained"*/}
                        {/*    color="primary"*/}
                        {/*    onClick={handleSubmit}*/}
                        {/*    disabled={loading}*/}
                        {/*>*/}
                        {/*    {loading ? <CircularProgress size={24}/> : 'Save Configuration'}*/}
                        {/*</Button>*/}
                    </Box>

                    <Snackbar
                        open={snackbarOpen}
                        autoHideDuration={6000}
                        onClose={handleCloseSnackbar}
                        message={snackbarMessage}
                    />

                </Paper>

            </Container>
        );
    }
;

export default EvalConfigPage;