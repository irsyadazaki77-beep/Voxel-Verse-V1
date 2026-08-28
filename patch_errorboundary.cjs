const fs = require('fs');

let content = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf-8');

content = content.replace("export class ErrorBoundary extends Component<Props, State> {", "export class ErrorBoundary extends React.Component<Props, State> {");
// Ensure it's not overriding Component from somewhere else.

fs.writeFileSync('src/components/ErrorBoundary.tsx', content);
