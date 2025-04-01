import { fetch } from "jsr:@std/fetch";

// Function to check if a port is in use
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    const response = await fetch(`http://localhost:${port}`, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}

// Function to send text to the inject endpoint
async function injectText(text: string): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/inject/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Text injected successfully:', data.message);
  } catch (error) {
    console.error('Failed to inject text:', error);
  }
}

// Main CLI function
export async function handleCliArgs(args: string[]): Promise<boolean> {
  // Check for inject command
  const injectIndex = args.findIndex(arg => arg === 'inject');
  
  if (injectIndex >= 0 && injectIndex < args.length - 1) {
    // Get everything after "inject"
    const textToInject = args.slice(injectIndex + 1).join(' ');
    
    // Check if server is already running
    const serverRunning = await isPortInUse(3000);
    
    if (serverRunning) {
      // If server is running, send the text to the inject endpoint
      await injectText(textToInject);
      return true; // Indicate we handled the command
    }
  }
  
  return false; // Indicate normal startup should proceed
}
