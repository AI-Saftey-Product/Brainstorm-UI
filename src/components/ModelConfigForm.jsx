import React, { useState } from 'react';
import { TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const ModelConfigForm = ({ onSubmit, initialConfig }) => {
  const [config, setConfig] = useState({
    name: '',
    source: 'huggingface',
    model_id: '',
    api_key: '',
    temperature: 0.7,
    max_tokens: 100,
    api_endpoint: '',
    ...initialConfig
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setConfig((prevConfig) => ({
      ...prevConfig,
      [name]: value
    }));
  };

  const renderSourceSpecificFields = () => {
    switch (config.source) {
      case 'openai':
        return (
          <>
            <TextField
              label="API Key"
              name="api_key"
              value={config.api_key}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="password"
            />
            <TextField
              label="Temperature"
              name="temperature"
              value={config.temperature}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 0, max: 1, step: 0.1 }}
            />
            <TextField
              label="Max Tokens"
              name="max_tokens"
              value={config.max_tokens}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 1 }}
            />
          </>
        );
      case 'llama':
        return (
          <>
            <TextField
              label="API Key"
              name="api_key"
              value={config.api_key}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="password"
            />
            <TextField
              label="API Endpoint"
              name="api_endpoint"
              value={config.api_endpoint}
              onChange={handleChange}
              fullWidth
              margin="normal"
              placeholder="http://localhost:8000/v1"
            />
            <TextField
              label="Temperature"
              name="temperature"
              value={config.temperature}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 0, max: 1, step: 0.1 }}
            />
            <TextField
              label="Max Tokens"
              name="max_tokens"
              value={config.max_tokens}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 1 }}
            />
          </>
        );
      case 'huggingface':
      default:
        return (
          <>
            <TextField
              label="API Key"
              name="api_key"
              value={config.api_key}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="password"
            />
            <TextField
              label="Temperature"
              name="temperature"
              value={config.temperature}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 0, max: 1, step: 0.1 }}
            />
          </>
        );
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <FormControl fullWidth margin="normal">
        <InputLabel>Model Source</InputLabel>
        <Select
          name="source"
          value={config.source}
          onChange={handleChange}
          label="Model Source"
        >
          <MenuItem value="huggingface">Hugging Face</MenuItem>
          <MenuItem value="openai">OpenAI</MenuItem>
          <MenuItem value="llama">Llama</MenuItem>
        </Select>
      </FormControl>
      {renderSourceSpecificFields()}
    </form>
  );
};

export default ModelConfigForm; 