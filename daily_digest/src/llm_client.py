"""Solar-Pro3 LLM client via Upstage API."""
import json
import re
import time
from typing import Any, Optional

from openai import OpenAI

from .config import get_config


class LLMClient:
    """Client for Solar LLM via Upstage API."""
    
    def __init__(self, model_override: Optional[str] = None):
        """Initialize OpenAI-compatible client for Upstage.
        
        Args:
            model_override: Use a specific model instead of config default.
                           e.g. "solar-pro" for non-reasoning tasks.
        """
        config = get_config()
        self.client = OpenAI(
            api_key=config.UPSTAGE_API_KEY,
            base_url=config.UPSTAGE_BASE_URL,
        )
        self.model = model_override or config.SOLAR_MODEL
    
    def chat(
        self,
        user_prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        reasoning_effort: str = "low",
        model_override: Optional[str] = None,
    ) -> str:
        """Send a chat completion request.
        
        Args:
            user_prompt: User message
            system_prompt: Optional system message
            temperature: Sampling temperature
            max_tokens: Maximum response tokens
            reasoning_effort: Reasoning level for Solar-Pro3 ("low", "medium", "high")
            model_override: Use a different model for this specific call
            
        Returns:
            Assistant's response text
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})
        
        model = model_override or self.model
        
        kwargs = dict(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        # Only pass reasoning_effort for reasoning models
        if "pro3" in model:
            kwargs["reasoning_effort"] = reasoning_effort
        
        response = self.client.chat.completions.create(**kwargs)
        
        # Rate limit delay - 1 second between calls
        time.sleep(1)
        
        message = response.choices[0].message
        
        # Solar-Pro3 is a reasoning model - check both content and reasoning fields
        content = message.content or ""
        
        # If content is empty, try to extract Korean text from reasoning
        if not content and hasattr(message, 'reasoning') and message.reasoning:
            content = self._extract_korean_from_reasoning(message.reasoning)
        
        return content
    
    def _extract_korean_from_reasoning(self, reasoning: str) -> str:
        """Extract Korean content from reasoning, filtering out English thinking.
        
        Solar-Pro3 puts the final Korean answer at the end of its reasoning.
        Strategy: Scan backwards to find the last substantial Korean block.
        """
        lines = reasoning.split('\n')
        
        # Scan from the end to find Korean content
        korean_block = []
        found_korean = False
        
        for line in reversed(lines):
            stripped = line.strip()
            
            if not stripped:
                if found_korean:
                    korean_block.append(line)
                continue
            
            # Count Korean characters
            korean_chars = sum(1 for c in stripped if '\uAC00' <= c <= '\uD7A3')
            
            # Is this line Korean-dominant?
            is_korean_line = korean_chars >= 3
            
            # Is this line clearly English reasoning?
            is_reasoning = (
                korean_chars == 0 and any(c.isascii() and c.isalpha() for c in stripped)
            ) or any(marker in stripped for marker in [
                'Let\'s', 'Actually', 'Check', 'Count', 'Wait',
                'characters:', 'indices:', '=>', 'That\'s', 'We need',
                'Must be', 'should be', 'Potential', 'syllable',
                'String:', 'Proposed', 'compliance',
            ])
            
            # Is this math/counting? (e.g. "+2 =4", "1 에", etc.)
            is_math = bool(re.match(r'^[\d\s+\-=*/<>().,]+$', stripped))
            
            if is_korean_line:
                found_korean = True
                korean_block.append(line)
            elif found_korean and not is_reasoning and not is_math:
                # Allow short non-Korean lines within a Korean block (punctuation, ---  etc.)
                if len(stripped) < 5 or stripped.startswith('#') or stripped.startswith('-'):
                    korean_block.append(line)
                else:
                    break  # Hit a non-Korean substantial line, stop
            elif found_korean and (is_reasoning or is_math):
                break  # Hit reasoning, stop collecting
        
        if korean_block:
            korean_block.reverse()
            # Strip leading/trailing blank lines
            while korean_block and not korean_block[0].strip():
                korean_block.pop(0)
            while korean_block and not korean_block[-1].strip():
                korean_block.pop()
            
            result = '\n'.join(korean_block)
            # Clean up excessive blank lines
            result = re.sub(r'\n{3,}', '\n\n', result)
            return result.strip()
        
        # Fallback: return original
        return reasoning
    
    def chat_json(
        self,
        user_prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2000,
        max_retries: int = 3,
    ) -> Any:
        """Send a chat request expecting JSON response.
        
        Args:
            user_prompt: User message (should include JSON format request)
            system_prompt: Optional system message
            temperature: Sampling temperature (lower for structured output)
            max_tokens: Maximum response tokens
            max_retries: Maximum retry attempts on JSON parse failure
            
        Returns:
            Parsed JSON object
        """
        last_error = None
        
        for attempt in range(1, max_retries + 1):
            response_text = self.chat(
                user_prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            
            try:
                return self._parse_json_response(response_text)
            except ValueError as e:
                last_error = e
                if attempt < max_retries:
                    print(f"⚠️  JSON 파싱 실패 (시도 {attempt}/{max_retries}), 재시도 중...")
                    time.sleep(1)  # Brief delay before retry
                    continue
                else:
                    raise ValueError(f"JSON 파싱 {max_retries}회 시도 실패: {last_error}")
    
    def _parse_json_response(self, text: str) -> Any:
        """Parse JSON from LLM response, handling various formats.
        
        Handles:
        - Pure JSON
        - JSON in markdown code blocks
        - JSON with reasoning prefix (Solar-Pro3 특성)
        """
        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Try extracting from code block
        code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if code_block_match:
            try:
                return json.loads(code_block_match.group(1).strip())
            except json.JSONDecodeError:
                pass
        
        # Try finding JSON object/array in text
        # Look for {...} or [...]
        json_obj_match = re.search(r"(\{[\s\S]*\})", text)
        if json_obj_match:
            try:
                return json.loads(json_obj_match.group(1))
            except json.JSONDecodeError:
                pass
        
        json_arr_match = re.search(r"(\[[\s\S]*\])", text)
        if json_arr_match:
            try:
                return json.loads(json_arr_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Fallback: return as string
        raise ValueError(f"Could not parse JSON from response: {text[:200]}...")
