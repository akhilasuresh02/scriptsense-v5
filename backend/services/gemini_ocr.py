import google.generativeai as genai
from PIL import Image
import io
import time
from config import Config

class GeminiOCRService:
    """Service for OCR using Google Gemini API"""
    
    def __init__(self):
        """Initialize Gemini API"""
        if not Config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not set in environment variables")
        
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
    def _generate_content_with_retry(self, inputs, config=None, max_retries=3):
        """Helper to retry API calls on 429 errors"""
        for attempt in range(max_retries):
            try:
                if config:
                    return self.model.generate_content(inputs, generation_config=config)
                return self.model.generate_content(inputs)
            except Exception as e:
                if "429" in str(e) or "Resource has been exhausted" in str(e):
                    if attempt < max_retries - 1:
                        wait_time = (2 ** attempt) + 1  # Exponential backoff: 2s, 3s, 5s
                        print(f"⚠️ Gemini 429 Limit hit. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                raise e
    
    def transcribe_handwriting(self, image_data, is_path=True):
        """
        Transcribe handwritten text from image
        
        Args:
            image_data: File path or PIL Image object
            is_path: Whether image_data is a file path
            
        Returns:
            Transcribed text string
        """
        try:
            if is_path:
                image = Image.open(image_data)
            else:
                image = image_data
            
            prompt = """Analyze this image of a handwritten academic derivation (Science/Math/Engineering).
            
            GOAL: Create a clean, readable transcription using actual symbols.
            
            1. SYMBOLS & NOTATION: 
               - Use actual Unicode mathematical symbols instead of LaTeX code where possible.
               - Examples: Use θ (theta), μ (mu), ρ (rho), ±, √, →, ¹, ², ³, etc.
               - Do NOT use dollar signs ($) or LaTeX backslashes (\) unless absolutely necessary for complex fractions.
               
            2. EQUATIONS: 
               - Write equations as they appear visually (e.g., "R sin θ + F cos θ = mv² / r").
               - Use standard text formatting for fractions (e.g., "a / b") unless they are very complex.
               
            3. STRUCTURE: 
               - Preserve line breaks and alignment exactly as written.
               - Include step identifiers like (1), (2), or ①, ②.
               
            4. ACCURACY: 
               - Distinguish between 'v' (velocity) and 'v' (greek nu) if possible, but prioritize readability.
               - Ensure subscripts are clear (e.g., "v_max" or "v_1").
               
            5. REDUNDANCY & AUTOCORRECTION:
               - Fix obvious spelling and grammatical errors to make the text meaningful, but preserve the original intent and scientific/mathematical meaning.
               - Do NOT change the meaning of the equations or symbols.
               
            6. RESPONSE FORMAT: 
               - Return ONLY the clean transcription text. No metadata or conversation."""
            
            response = self._generate_content_with_retry([prompt, image])
            
            if response and response.text:
                return response.text.strip()
            else:
                return "No text could be transcribed from this image."
                
        except Exception as e:
            print(f"Error in transcription: {str(e)}")
            return f"Error: {str(e)}"
    
    def extract_diagram(self, image_data, is_path=True):
        """
        Analyze image to detect and describe diagrams
        
        Args:
            image_data: File path or PIL Image object
            is_path: Whether image_data is a file path
            
        Returns:
            Dictionary with diagram information
        """
        try:
            if is_path:
                image = Image.open(image_data)
            else:
                image = image_data
            
            prompt = """Analyze this image region for SCIENTIFIC, MATHEMATICAL, or EDUCATIONAL diagrams, charts, or sketches.
            
            CRITICAL INSTRUCTIONS:
            1. If a diagram is present, describe its GEOMETRIC and STRUCTURAL properties (e.g., "Right-angled triangle with labels A, B, C", "Circuit with resistor and battery").
            2. Identify any labels, variables, or values associated with the diagram.
            3. For graphs: Identify the axes, labels, and general trend (e.g., "Linear graph through origin").
            4. Ignore random scribbles or crossed-out content.
            
            IF A VALID DIAGRAM IS FOUND:
            - Type: [Specific type of diagram]
            - Labels: [List all visible labels and numbers]
            - Description: [Detailed structural description]
            
            IF NO VALID DIAGRAM IS FOUND:
            - Explicitly respond with "No diagrams found."."""
            
            response = self._generate_content_with_retry([prompt, image])
            
            if response and response.text:
                has_diagram = "no diagram" not in response.text.lower() and "no valid diagram" not in response.text.lower()
                return {
                    'has_diagram': has_diagram,
                    'description': response.text.strip(),
                    'image_available': True
                }
            else:
                return {
                    'has_diagram': False,
                    'description': 'Could not analyze image',
                    'image_available': False
                }
                
        except Exception as e:
            print(f"Error in diagram extraction: {str(e)}")
            return {
                'has_diagram': False,
                'description': f'Error: {str(e)}',
                'image_available': False
            }
    
    def auto_analyze_page(self, image_data, is_path=True):
        """
        Automatically analyze a full page to extract transcription and diagram bounding boxes.
        
        Args:
            image_data: File path or PIL Image object
            is_path: Whether image_data is a file path
            
        Returns:
            Dictionary with transcription and a list of diagram objects
        """
        try:
            if is_path:
                image = Image.open(image_data)
            else:
                image = image_data
            
            prompt = """Analyze this image of an academic answer sheet. I need a complete transcription of all handwritten text and identification of all diagrams.
            
            Return the result in a valid JSON format with the following structure:
            {
              "transcription": "The full transcription of all text on the page, preserving order and using actual symbols (θ, μ, ρ, v², etc.)",
              "diagrams": [
                {
                  "description": "Short description of what the diagram represents",
                  "bounding_box": [ymin, xmin, ymax, xmax] 
                }
              ],
              "answer_numbers": [1, 2, 3]
            }

            CRITICAL FOR DIAGRAMS:
            1. Bounding boxes MUST be in normalized coordinates [0-1000] where [0,0] is top-left and [1000,1000] is bottom-right.
            2. Be GENEROUS with diagram bounding boxes. Include all related labels, vectors, axis titles, and satellite components.
            3. If a diagram has labels (like 'mg', 'R sin θ', 'F cos θ') nearby, they MUST be included in the bounding box.
            4. If there are no diagrams, return an empty list for "diagrams".
            5. Use actual symbols for Math/Science notation.
            6. AUTOCORRECTION: Fix obvious spelling and grammatical errors in the transcription to make the text meaningful, but preserve the original intent.
            7. FORMATTING: Use markdown headers for distinct sections if clear.
            8. MARGIN NUMBERS (CRITICAL):
               - Look for question numbers (e.g., '1.', 'Q1', '2a', '3)', '(a)') in the left margin or start of lines.
               - IMPORTANT: Start the corresponding text block with specific bold labels like '**Q1.**', '**Q2(a).**', etc.
               - Ensure every answer block is clearly associated with its question identifier if visible.
            9. ANSWER LABELS (CRITICAL):
               - Look for answer labels written as "ans1:", "ans 1:", "Ans2:", "ANS3:", "answer 1:", "Answer2:", "ans1.", "Ans 1)", etc.
               - These mark where a student's answer to a particular question begins.
               - Extract the numeric part from each label found (e.g., "ans1:" → 1, "Ans 3:" → 3).
               - Include them in the JSON output as "answer_numbers": [1, 3, ...] (sorted, unique integers).
               - If no such labels are found, return "answer_numbers": [].
            10. Return ONLY the JSON object. No other text."""
            
            # Using JSON mode if supported
            try:
                try:
                    response = self._generate_content_with_retry(
                        [prompt, image],
                        config={"response_mime_type": "application/json"}
                    )
                except Exception as config_err:
                    # Fallback if response_mime_type is not supported
                    print(f"⚠️ JSON mode not supported: {config_err}. Falling back to standard text.")
                    response = self._generate_content_with_retry([prompt, image])
                
                if not response or not response.text:
                    return {
                        'transcription': "AI returned an empty response.",
                        'diagrams': [],
                        'success': False,
                        'error': "Empty response from Gemini"
                    }

                import json
                text = response.text
                print(f"DEBUG_GEMINI_RAW: {text}")
                
                import re
                
                # Cleanup text if not in JSON-only mode (remove markdown blocks)
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                
                # Fallback: Extraction using regex if potential JSON is found but not in code blocks
                if not text.startswith('{'):
                    json_match = re.search(r'(\{.*\})', text, re.DOTALL)
                    if json_match:
                        text = json_match.group(1)

                try:
                    result = json.loads(text)
                    
                    # Parse transcription for question blocks
                    transcription_text = result.get('transcription', '')
                    questions = []
                    
                    try:
                        # Regex to find blocks starting with **Q...** or **1...**
                        # Captures: 1. The ID (e.g. Q1, 1a), 2. The content until next tag
                        question_blocks = re.split(r'(\*\*(?:Q\d+|Q?\d+[a-z]?|\d+[\.\)])[\w\s\.]*\*\*)', transcription_text)
                        
                        if len(question_blocks) > 1:
                            # 0 is usually empty pre-match text, then pairs of (Header, Content)
                            current_header = ""
                            for i in range(1, len(question_blocks), 2):
                                header = question_blocks[i].replace('*', '').strip()
                                content = question_blocks[i+1].strip() if i+1 < len(question_blocks) else ""
                                questions.append({
                                    'id': header,
                                    'content': content
                                })
                    except Exception as parse_e:
                        print(f"Error parsing question blocks: {parse_e}")

                    # Extract answer_numbers from Gemini response
                    answer_numbers = result.get('answer_numbers', [])
                    
                    # Fallback: also detect answer labels via regex on transcription text
                    ans_pattern = re.findall(r'(?i)\bans(?:wer)?\s*(\d+)\s*[:.)]', transcription_text)
                    if ans_pattern:
                        regex_nums = sorted(set(int(n) for n in ans_pattern))
                        # Merge with Gemini-detected ones
                        merged = sorted(set(answer_numbers) | set(regex_nums))
                        answer_numbers = merged
                    
                    return {
                        'transcription': transcription_text,
                        'questions': questions,
                        'diagrams': result.get('diagrams', []),
                        'answer_numbers': answer_numbers,
                        'success': True
                    }
                except json.JSONDecodeError as je:
                    print(f"JSON Decode Failed. Text: {text[:200]}...")
                    return {
                        'transcription': "Failed to parse AI response as JSON.",
                        'diagrams': [],
                        'success': False,
                        'error': f"JSON Decode Error: {str(je)}"
                    }
            except Exception as e:
                # Handle safety filters or blocked responses
                error_msg = str(e)
                if "safety" in error_msg.lower():
                    error_msg = "Content flagged by safety filters. Please ensure the handwriting is clear and appropriate."
                return {
                    'transcription': "AI Analysis failed.",
                    'diagrams': [],
                    'success': False,
                    'error': error_msg
                }
                
        except Exception as e:
            print(f"Error in automatic analysis: {str(e)}")
            return {
                'transcription': f"Error: {str(e)}",
                'diagrams': [],
                'success': False
            }

    def analyze_answer_key_page(self, image_data, is_path=True):
        """
        Analyze a page of an answer key / rubric / marking scheme to extract per-question criteria.
        Uses a specialised prompt that understands answer key formats (printed/typed text,
        numbered answers, marking schemes, etc.) rather than handwritten student answers.
        
        Returns:
            dict with 'questions': [{'id': 'Q1.', 'content': '...'}, ...] and 'success': bool
        """
        try:
            if is_path:
                image = Image.open(image_data)
            else:
                image = image_data

            prompt = """Analyze this image of an answer key, marking scheme, or evaluation rubric for an academic exam.

            GOAL: Extract each question's model answer or evaluation criteria separately.

            Return the result in a valid JSON format:
            {
              "questions": [
                {
                  "id": "Q1.",
                  "content": "The full model answer or evaluation criteria for this question"
                },
                {
                  "id": "Q2.",
                  "content": "..."
                }
              ]
            }

            CRITICAL INSTRUCTIONS:
            1. Look for question/answer markers in ANY format:
               - "Q1", "Q2", "Question 1", "Ans 1", "Answer 1", "1.", "1)", "(1)", "Q1.", etc.
               - The document may use "Ans 1:", "Answer 2:", or simply numbered sections.
            2. Extract the COMPLETE answer/criteria text for each question until the next question begins.
            3. Preserve mathematical symbols and notations.
            4. Fix obvious spelling errors but preserve technical meaning.
            5. If a question spans multiple sections on the page, combine them.
            6. CRITICAL: Extract the ACTUAL question number written in the document (e.g. if it says "Ans 4:", the ID must be "Q4."). DO NOT simply number the answers sequentially (1, 2, 3...). 
            7. Normalise the question IDs to a consistent format like "Q1.", "Q2.", "Q3.", etc.
               For sub-parts use "Q1a.", "Q1b.", etc.
            8. If no distinct questions are found, return "questions": [].
            9. Return ONLY the JSON object. No other text."""

            try:
                response = self._generate_content_with_retry(
                    [prompt, image],
                    config={"response_mime_type": "application/json"}
                )
            except Exception as config_err:
                print(f"⚠️ JSON mode not supported: {config_err}. Falling back to standard text.")
                response = self._generate_content_with_retry([prompt, image])

            if not response or not response.text:
                return {'questions': [], 'success': False, 'error': 'Empty response from Gemini'}

            import json, re
            text = response.text
            print(f"DEBUG_ANSWER_KEY_RAW: {text[:500]}")

            # Cleanup markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            if not text.startswith('{'):
                json_match = re.search(r'(\{.*\})', text, re.DOTALL)
                if json_match:
                    text = json_match.group(1)

            try:
                result = json.loads(text)
                return {
                    'questions': result.get('questions', []),
                    'success': True
                }
            except json.JSONDecodeError as je:
                print(f"Answer key JSON parse failed: {text[:200]}...")
                return {'questions': [], 'success': False, 'error': str(je)}

        except Exception as e:
            print(f"Error in answer key analysis: {str(e)}")
            return {'questions': [], 'success': False, 'error': str(e)}

    def evaluate_answer(self, student_answer, rubric_criteria, max_marks, question_text=None):
        """
        Evaluate a student's answer against rubric criteria using Gemini.
        This is an ADVISORY evaluation — the final marks are always set by the human evaluator.

        Args:
            student_answer: Transcribed text of the student's answer
            rubric_criteria: The model answer / evaluation criteria from the rubric
            max_marks: Maximum marks for this question
            question_text: Optional question text for additional context

        Returns:
            dict with suggested_marks, covered_points, missing_points, explanation
        """
        try:
            if not student_answer or not student_answer.strip():
                return {
                    'suggested_marks': 0,
                    'max_marks': max_marks,
                    'covered_points': [],
                    'missing_points': ['No answer provided by the student.'],
                    'explanation': 'The student has not written any answer for this question.',
                    'success': True
                }

            if not rubric_criteria or not rubric_criteria.strip():
                return {
                    'suggested_marks': None,
                    'max_marks': max_marks,
                    'covered_points': [],
                    'missing_points': [],
                    'explanation': 'No rubric criteria available for AI evaluation.',
                    'success': False,
                    'error': 'Missing rubric criteria'
                }

            question_context = ""
            if question_text:
                question_context = f"\n\nQUESTION:\n{question_text}"

            prompt = f"""You are an academic evaluator. Your task is to evaluate a student's handwritten answer 
against the provided rubric/answer key criteria.

MAXIMUM MARKS FOR THIS QUESTION: {max_marks}{question_context}

RUBRIC / MODEL ANSWER / EVALUATION CRITERIA:
{rubric_criteria}

STUDENT'S ANSWER (transcribed from handwriting):
{student_answer}

EVALUATION INSTRUCTIONS:
1. Break down the rubric into individual key points or concepts.
2. For each key point, check if the student's answer covers it (even if worded differently — use semantic understanding).
3. Award partial marks proportionally based on how many key points are covered.
4. Consider the quality and depth of explanation, not just keyword matching.
5. Be fair but strict — the student must demonstrate understanding, not just mention terms.
6. NEVER award more than {max_marks} marks.

Return the result in valid JSON format:
{{
  "suggested_marks": <number between 0 and {max_marks}>,
  "covered_points": [
    "Point 1 that the student covered correctly",
    "Point 2 that the student addressed"
  ],
  "missing_points": [
    "Point X that was in the rubric but missing from the answer",
    "Point Y that was incomplete or incorrect"
  ],
  "explanation": "A brief 2-3 sentence summary of the overall evaluation rationale."
}}

CRITICAL RULES:
- suggested_marks must be a number (can be decimal like 3.5).
- suggested_marks must be between 0 and {max_marks} (inclusive).
- Each covered_point and missing_point should be a concise, clear statement.
- The explanation should justify why marks were awarded or deducted.
- Return ONLY the JSON object. No other text."""

            try:
                response = self._generate_content_with_retry(
                    [prompt],
                    config={"response_mime_type": "application/json"}
                )
            except Exception as config_err:
                print(f"⚠️ JSON mode not supported for evaluation: {config_err}. Falling back.")
                response = self._generate_content_with_retry([prompt])

            if not response or not response.text:
                return {
                    'suggested_marks': None,
                    'max_marks': max_marks,
                    'covered_points': [],
                    'missing_points': [],
                    'explanation': 'AI returned an empty response.',
                    'success': False,
                    'error': 'Empty response from Gemini'
                }

            import json, re
            text = response.text

            # Cleanup markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            if not text.startswith('{'):
                json_match = re.search(r'(\{.*\})', text, re.DOTALL)
                if json_match:
                    text = json_match.group(1)

            try:
                result = json.loads(text)

                # Clamp suggested marks
                suggested = result.get('suggested_marks', 0)
                if suggested is not None:
                    suggested = max(0, min(float(suggested), float(max_marks)))

                return {
                    'suggested_marks': suggested,
                    'max_marks': float(max_marks),
                    'covered_points': result.get('covered_points', []),
                    'missing_points': result.get('missing_points', []),
                    'explanation': result.get('explanation', ''),
                    'success': True
                }
            except json.JSONDecodeError as je:
                print(f"AI evaluation JSON parse failed: {text[:300]}...")
                return {
                    'suggested_marks': None,
                    'max_marks': max_marks,
                    'covered_points': [],
                    'missing_points': [],
                    'explanation': 'Failed to parse AI evaluation response.',
                    'success': False,
                    'error': str(je)
                }

        except Exception as e:
            print(f"Error in AI evaluation: {str(e)}")
            return {
                'suggested_marks': None,
                'max_marks': max_marks,
                'covered_points': [],
                'missing_points': [],
                'explanation': f'Error: {str(e)}',
                'success': False,
                'error': str(e)
            }

    def process_pdf_region(self, image_data, coordinates=None):
        """
        Process a specific region of a PDF page
        """
        try:
            image = image_data
            
            # Crop if coordinates provided
            if coordinates:
                x = float(coordinates.get('x', 0))
                y = float(coordinates.get('y', 0))
                w_coord = float(coordinates.get('width', 0))
                h_coord = float(coordinates.get('height', 0))
                
                # Check if coordinates are normalized (0-1)
                if x <= 1.0 and y <= 1.0 and w_coord <= 1.0 and h_coord <= 1.0:
                    x = int(x * image.width)
                    y = int(y * image.height)
                    width = int(w_coord * image.width)
                    height = int(h_coord * image.height)
                else:
                    width = int(w_coord) if w_coord > 0 else image.width
                    height = int(h_coord) if h_coord > 0 else image.height
                
                # Ensure we don't go out of bounds
                x = max(0, x)
                y = max(0, y)
                width = min(width, image.width - x)
                height = min(height, image.height - y)
                
                if width > 0 and height > 0:
                    image = image.crop((x, y, x + width, y + height))
            
            # Get both transcription and diagram analysis
            transcription = self.transcribe_handwriting(image, is_path=False)
            diagram_info = self.extract_diagram(image, is_path=False)
            
            return {
                'transcription': transcription,
                'diagram_info': diagram_info,
                'success': True
            }
            
        except Exception as e:
            print(f"Error processing PDF region: {str(e)}")
            return {
                'transcription': '',
                'diagram_info': {'has_diagram': False, 'description': '', 'image_available': False},
                'success': False,
                'error': str(e)
            }
