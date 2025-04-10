# Brainstorm-UI

## Features

- **Model Management**
  - Configure and manage multiple AI models
  - Support for different model types and sources
  - Model performance tracking and comparison

- **Test Configuration**
  - Customizable test parameters
  - Multiple test types support
  - Test result visualization

- **Dataset Management**
  - Upload and manage test datasets
  - Dataset versioning
  - Dataset analysis tools

- **Results Analysis**
  - Comprehensive test results visualization
  - Performance metrics tracking
  - Export capabilities

## Tech Stack

- **Frontend**
  - React 18
  - Material UI (MUI) v6
  - React Router v7
  - Vite
  - Recharts for data visualization

- **Development Tools**
  - ESLint for code linting
  - Vitest for testing
  - Vite Bundle Visualizer for optimization

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/BrainstormAPITEST.git
   cd BrainstormAPITEST
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_API_URL=your_api_url
   VITE_API_KEY=your_api_key
   ```

### Development

To start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:XXXX`

### Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

The build files will be generated in the `dist` directory.

## Project Structure

```
BrainstormAPITEST/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── services/      # API and service functions
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── theme/         # MUI theme configuration
│   ├── styles/        # Global styles
│   ├── utils/         # Utility functions
│   ├── App.jsx        # Main application component
│   └── index.jsx      # Application entry point
├── public/            # Static assets
├── dist/              # Production build
└── package.json       # Project dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run analyze` - Analyze bundle size

## License

This project is licensed under the MIT License - see the LICENSE file for details.
