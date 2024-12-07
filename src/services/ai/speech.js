import { openai } from './openai.js';
import speech from 'speech-to-text';
import { promisify } from 'util';
import fs from 'fs';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export async function speechToText(audioBuffer) {
  try {
    const result = await speech.recognize(audioBuffer, {
      language: 'en-US',
    });
    return result.text;
  } catch (error) {
    console.error('Speech to text error:', error);
    throw error;
  }
}

export async function textToSpeech(text) {
  try {
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const tempFile = `/tmp/voice_${Date.now()}.mp3`;
    
    await writeFile(tempFile, buffer);
    return tempFile;
  } catch (error) {
    console.error('Text to speech error:', error);
    throw error;
  }
}

export async function cleanupAudioFile(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up audio file:', error);
  }
}