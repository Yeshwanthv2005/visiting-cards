import requests
import base64
import json

class OllamaService:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url

    def _resolve_model_name(self, model_name):
        """Resolve shorthand model names to an installed Ollama tag when possible."""
        available = self.list_local_models()
        if model_name in available:
            return model_name

        tagged = f"{model_name}:latest"
        if tagged in available:
            return tagged

        prefix_matches = [m for m in available if m.startswith(f"{model_name}:")]
        if prefix_matches:
            return prefix_matches[0]

        return model_name

    def _generate(self, payload):
        response = requests.post(
            f"{self.base_url}/api/generate",
            json=payload,
            timeout=300
        )
        response.raise_for_status()
        return response.json()

    async def extract_card_data(self, image_bytes, model_name="gemma4:31b-cloud"):
        """
        Extract structured data from a visiting card image using a local or cloud Ollama model.
        """
        # Encode image to base64
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        prompt = """
        Read the visiting card image and extract the following information into a structured JSON format.
        
        REQUIRED FIELDS:
        1. organization_name: Full name of the company, university, or institution.
        2. point_person: Full name of the person on the card.
        3. department: Designation, job title, or department.
        4. location: City, State, or Country only (not full address).
        5. contact_number: Phone or mobile number.
        6. contact_email: Email address.
        7. organization_type: One of [university, business, consultancy, NGO, startup, government].
        
        Respond STRICTLY with a valid JSON object. Do not include any preamble or extra text.
        """

        resolved_model = self._resolve_model_name(model_name)

        payload = {
            "model": resolved_model,
            "prompt": prompt,
            "stream": False,
            "images": [image_b64],
            "format": "json"
        }

        try:
            result = self._generate(payload)
            
            # The model might return a stringified JSON in the 'response' field
            extracted_text = result.get("response", "")
            return json.loads(extracted_text), None
        except requests.HTTPError as e:
            error_text = ""
            try:
                error_text = e.response.json().get("error", "")
            except Exception:
                error_text = str(e)

            # Fallback to a lighter vision model when memory is insufficient.
            if "requires more system memory" in error_text.lower():
                fallback_model = self._resolve_model_name("moondream")
                if fallback_model != resolved_model:
                    try:
                        fallback_payload = dict(payload)
                        fallback_payload["model"] = fallback_model
                        result = self._generate(fallback_payload)
                        extracted_text = result.get("response", "")
                        return json.loads(extracted_text), None
                    except Exception as fallback_error:
                        return None, f"Primary model memory error ({error_text}). Fallback failed: {fallback_error}"

            return None, error_text or str(e)
        except Exception as e:
            return None, str(e)

    def list_local_models(self):
        """List available local vision models from Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            models = response.json().get("models", [])
            # Filter for typically vision-capable models or just show all for selection
            return [m["name"] for m in models]
        except Exception:
            # Fallback defaults if Ollama isn't running
            return ["llava", "moondream"]
