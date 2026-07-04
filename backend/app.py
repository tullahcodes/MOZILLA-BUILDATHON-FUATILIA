from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import requests
import hashlib
import os

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get('DEEPSEEK_API_KEY')

# Load mock data
def load_data():
    with open('data.json') as f:
        return json.load(f)

def save_data(data):
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=2)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def find_parent(data, national_id):
    return next((p for p in data if p['national_id'] == national_id), None)


# REGISTER
@app.route('/register', methods=['POST'])
def register():
    body = request.json
    national_id = body.get('national_id')
    reference_number = body.get('reference_number')
    password = body.get('password')

    data = load_data()
    parent = find_parent(data, national_id)

    if not parent:
        return jsonify({'success': False, 'message': 'National ID not found. Please check your details.'})

    if parent['reference_number'] != reference_number:
        return jsonify({'success': False, 'message': 'Reference number does not match. Please check your application receipt.'})

    if parent['is_registered']:
        return jsonify({'success': False, 'message': 'This account is already registered. Please login.'})

    parent['password'] = hash_password(password)
    parent['is_registered'] = True
    save_data(data)

    return jsonify({'success': True, 'message': 'Account created successfully. You can now login.'})


# LOGIN
@app.route('/login', methods=['POST'])
def login():
    body = request.json
    national_id = body.get('national_id')
    password = body.get('password')

    data = load_data()
    parent = find_parent(data, national_id)

    if not parent:
        return jsonify({'success': False, 'message': 'National ID not found.'})

    if not parent['is_registered']:
        return jsonify({'success': False, 'message': 'Account not registered. Please register first.'})

    if parent['password'] != hash_password(password):
        return jsonify({'success': False, 'message': 'Incorrect password. Please try again.'})

    return jsonify({
        'success': True,
        'parent_name': parent['parent_name'],
        'national_id': parent['national_id'],
        'children': parent['children']
    })


# ADD CHILD
@app.route('/add-child', methods=['POST'])
def add_child():
    body = request.json
    national_id = body.get('national_id')
    reference_number = body.get('reference_number')

    if not national_id or not reference_number:
        return jsonify({'success': False, 'message': 'Missing National ID or Reference Number.'})

    data = load_data()
    parent = find_parent(data, national_id)

    if not parent:
        return jsonify({'success': False, 'message': 'Logged-in parent record not found.'})

    # Find the parent record that owns the reference number
    target_parent = next((p for p in data if p['reference_number'] == reference_number), None)
    if not target_parent:
        return jsonify({'success': False, 'message': 'Reference number not found in database.'})

    # Gather children from target parent
    new_children_added = []
    existing_nemis = {c['nemis_number'] for c in parent['children']}

    for child in target_parent['children']:
        if child['nemis_number'] not in existing_nemis:
            parent['children'].append(child)
            new_children_added.append(child['student_name'])

    if not new_children_added:
        return jsonify({'success': False, 'message': 'All students associated with this reference number are already added.'})

    save_data(data)
    return jsonify({
        'success': True,
        'message': f"Successfully added: {', '.join(new_children_added)}",
        'children': parent['children']
    })


# TRACK
@app.route('/track', methods=['POST'])
def track():
    body = request.json
    national_id = body.get('national_id')
    nemis_number = body.get('nemis_number')

    data = load_data()
    parent = find_parent(data, national_id)

    if not parent:
        return jsonify({'success': False, 'message': 'Parent not found.'})

    child = next((c for c in parent['children']
                  if c['nemis_number'] == nemis_number), None)

    if not child:
        return jsonify({'success': False, 'message': 'Student record not found.'})

    prompt = f"""
    You are Fuatilia, a bursary tracking assistant helping Kenyan parents 
    track their children's NG-CDF bursary applications.
    
    Analyze this bursary record and write a clear, simple status message 
    for the parent. Follow these rules:
    - Use plain language a rural Kenyan parent would understand
    - Do not use technical terms
    - Do not accuse anyone of wrongdoing
    - If there is an anomaly, state the facts clearly and advise the parent 
      what to do next
    - Keep it under 100 words
    - End with one clear next step for the parent
    
    Bursary record:
    {json.dumps(child, indent=2)}
    """

    try:
        response = requests.post(
            'https://api.deepseek.com/chat/completions',
            headers={
                'Authorization': f'Bearer {API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'deepseek-chat',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 300
            }
        )

        print(f"DeepSeek raw response: {response.json()}")
        ai_message = response.json()['choices'][0]['message']['content']

    except Exception as e:
        print(f"DeepSeek error: {e}")
        ai_message = "We were unable to analyze your record at this time. Please try again shortly."

    return jsonify({
        'success': True,
        'child': child,
        'ai_message': ai_message
    })


if __name__ == '__main__':
    app.run(debug=True)