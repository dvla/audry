# ElevenLabs Audio Format Support

In `textToSpeechEleven.ts`, we use the ElevenLabs API to convert text to speech. ElevenLabs supports various audio formats, we specify the desired format at line 12 `OUTPUT_FORMAT = 'mp3_44100_128'`.

This format indicates that we want an MP3 file with a sample rate of 44100 Hz and a bitrate of 128 kbps. The audio is mono with only one channel.

## Audio Formatting

To find the audio format of a file, we can use :

```bash
ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate,bit_rate,channels,codec_name -of default=noprint_wrappers=1 your_filename.mp3
```

example output:

```
codec_name=mp3
sample_rate=44100
channels=1
bit_rate=128000
```

There is a script `scripts/analyze-audio-files.sh` that checks the audio format of all files in a folder. For example,
`./scripts/analyze-audio-files.sh src/audio`

To convert to a specific format, we can use `ffmpeg`:

```bash
ffmpeg -i input.mp3 -ar 44100 -ac 1 -b:a 128k output.mp3
```

This command converts `input.mp3` to `output.mp3` with a sample rate of 44100 Hz, mono channel, and a bitrate of 128 kbps.

## Invalid concatenated file

- Each chunk coming back from ElevenLabs is a self-contained MP3, complete with its own ID3v2 tag and the first frame’s **Xing/LAME VBR header**. That header stores “total frames”/“total samples” for the file it was generated for example, 223 488 samples → 5.0416 s.
- When you `Buffer.concat` the chunks, you simply append the next MP3 after the first one’s ID3v1 footer. Players and metadata tools still honour the very first Xing/LAME header they encounter, so they keep reporting the original 5.04 s even though additional audio frames follow.

There is script `scripts/fix-audio.sh` that can fix this by re-encoding the xing header of the concatenated file. It does the following:

1. Checks the duration of the concatenated file using `ffprobe`.

   ```
   ffprobe -hide_banner -show_entries format=duration filename.mp3
   ```

2. Checks if the output contains `invalid concatenated file detected`.
3. If it does, it re-encodes the file using `ffmpeg` to ensure proper formatting.

   ```
   ffmpeg -i file.mp3 -c copy -map_metadata -1 -write_xing 1 file_fixed.mp3
   ```

4. Checks the duration of the fixed file to ensure it is correct.

## Prerequisites

- `ffmpeg` and `ffprobe` must be installed on your system. On Mac, you can use `brew install ffmpeg`.
