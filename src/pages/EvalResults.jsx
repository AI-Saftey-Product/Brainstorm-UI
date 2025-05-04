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
    Container, Stack, Card, CardContent,
} from '@mui/material';
import {useAppContext} from '../context/AppContext';
import {createModelAdapter} from '../services/modelAdapter';
import {saveModelConfig} from '../services/modelStorageService';
import DatasetConfigForm from "@/components/widgets/DatasetConfigForm.jsx";
import EvalConfigForm from "@/components/widgets/EvalConfigForm.jsx";

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';
function TreeNode({ name, data }) {
  const isObject =
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data);

  return (
    <li>
      {isObject ? (
        <>
          <strong>{name}</strong>
          <ul style={{ paddingLeft: 16 }}>
            {Object.entries(data).map(([key, val]) => (
              <TreeNode key={key} name={key} data={val} />
            ))}
          </ul>
        </>
      ) : (
        <span>
          {name}: {String(data)}
        </span>
      )}
    </li>
  );
}
const EvalConfigPage = () => {
        const navigate = useNavigate();
        const location = useLocation();

        const [logs, setLogs] = useState([]);
        const [isLoading, setIsLoading] = useState(false);

        // Check if we have a config passed in from location state (for editing)
        const {eval_id} = useParams();

        const [passedConfig, setSavedConfigs] = useState([]);
        useEffect(() => {
            if (eval_id) {
                fetch(`${API_BASE_URL}/api/evals/get_evals?eval_id=${eval_id}`, {
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

        const startStreaming = async () => {
            setIsLoading(true);
            setLogs([]); // Clear previous logs

            try {
                const response = await fetch(`${API_BASE_URL}/api/evals/run_eval?eval_id=${eval_id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}), // send any payload if needed
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, {stream: true});

                    let lines = buffer.split('\n');
                    buffer = lines.pop(); // Last item may be incomplete

                    for (let line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            setLogs((prevLogs) => [...prevLogs, parsed]);
                        } catch (e) {
                            console.error('Invalid JSON line:', line);
                        }
                    }
                }

                if (buffer) {
                    try {
                        const final = JSON.parse(buffer);
                        setLogs((prevLogs) => [...prevLogs, final]);
                    } catch (e) {
                        console.warn('Final incomplete line ignored.');
                    }
                }
            } catch (err) {
                console.error('Streaming error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        return (
            <Container maxWidth="lg">

                <Typography
                    variant="h3"
                    component="h1"
                    sx={{mb: 4}}
                >
                    Eval Results
                </Typography>

                <Paper sx={{p: 3, mb: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider'}}>

                    <div className="p-4">
                        {/*<Button*/}
                        {/*    variant="contained"*/}
                        {/*    color="primary"*/}
                        {/*    onClick={loadLogs}*/}
                        {/*    disabled={isLoading}*/}
                        {/*>*/}
                        {/*    {isLoading ? <CircularProgress size={24}/> : 'Load Previous Eval'}*/}
                        {/*</Button>*/}

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={startStreaming}
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24}/> : 'Start Eval'}
                        </Button>

                        <Stack spacing={2}>
                            {logs.slice(0, -2).map((log, index) => (
                                <Card key={index} variant="outlined">
                                    <Typography
                                        variant="body2"
                                        sx={{whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}
                                    >
                                        <strong>Input:</strong>
                                        {log.input}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}
                                    >
                                        <strong>Output: </strong>
                                        {log.output}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}
                                    >
                                        <strong>Prediction: </strong>
                                        {log.prediction}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}

                                    >
                                        <strong>Score: </strong>
                                        <span style={{color: log.score ? 'green' : 'red'}}>{String(log.score)}</span>
                                    </Typography>
                                </Card>
                            ))}
                        </Stack>

                        <Stack spacing={2}>
                            {logs.slice(-2).map((log, index) => (
                                <Card key={index} variant="outlined">
                                    <CardContent>
                                        {
                                            Object.entries(log).map(([key, value]) => (
                                                <Typography
                                                    variant="body2"
                                                    sx={{whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}
                                                >
                                                    <TreeNode key={key} name={key} data={value} />
                                                </Typography>
                                            ))
                                        }
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </div>
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

                </Paper>

            </Container>
        );
    }
;

export default EvalConfigPage;