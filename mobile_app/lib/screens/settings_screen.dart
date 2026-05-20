import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/config_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late TextEditingController _hostController;
  late TextEditingController _portController;

  @override
  void initState() {
    super.initState();
    final config = ref.read(configProvider);
    _hostController = TextEditingController(text: config.serverHost);
    _portController = TextEditingController(text: config.serverPort.toString());
  }

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final config = ref.watch(configProvider);

    if (_hostController.text != config.serverHost) {
      _hostController.text = config.serverHost;
    }
    if (_portController.text != config.serverPort.toString()) {
      _portController.text = config.serverPort.toString();
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text("Settings"),
        actions: [
          IconButton(
            onPressed: () => ref.read(configProvider.notifier).toggleTheme(),
            icon: Icon(config.isDark ? Icons.light_mode : Icons.dark_mode),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildSectionTitle("PC SERVER CONFIG"),
          const SizedBox(height: 16),
          TextField(
            controller: _hostController,
            decoration: InputDecoration(
              labelText: "Server Host",
              hintText: "localhost, 10.0.2.2, or 192.168.1.5",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              prefixIcon: const Icon(Icons.computer),
            ),
            onChanged: (val) => ref.read(configProvider.notifier).setHost(val),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _portController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: "Server Port",
              hintText: "8000",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              prefixIcon: const Icon(Icons.numbers),
            ),
            onChanged: (val) => ref.read(configProvider.notifier).setPort(val),
          ),
          const SizedBox(height: 16),
          const Text(
            "Update both values when you move the backend. Use localhost for desktop, 10.0.2.2 for Android emulator.",
            style: TextStyle(color: Colors.grey, fontSize: 12),
          ),
          
          const SizedBox(height: 40),
          _buildSectionTitle("AI MODEL SELECTION"),
          const SizedBox(height: 16),
          
          ListTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            tileColor: config.selectedModel == "llava" 
                ? Theme.of(context).colorScheme.primaryContainer 
                : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
            title: const Text("Llava v1.5 (Balanced)"),
            subtitle: const Text("Accurate and reliable for most cards."),
            leading: const Icon(Icons.psychology),
            trailing: config.selectedModel == "llava" ? const Icon(Icons.check_circle, color: Colors.green) : null,
            onTap: () => ref.read(configProvider.notifier).setModel("llava"),
          ),
          const SizedBox(height: 12),
          ListTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            tileColor: config.selectedModel == "gemma4:31b-cloud" 
                ? Theme.of(context).colorScheme.primaryContainer 
                : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
            title: const Text("Gemma 4 (Fast Cloud)"),
            subtitle: const Text("Extremely fast and accurate via Cloud OCR."),
            leading: const Icon(Icons.cloud_queue),
            trailing: config.selectedModel == "gemma4:31b-cloud" ? const Icon(Icons.check_circle, color: Colors.green) : null,
            onTap: () => ref.read(configProvider.notifier).setModel("gemma4:31b-cloud"),
          ),
          const SizedBox(height: 12),
          ListTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            tileColor: config.selectedModel == "gemma3:4b" 
                ? Theme.of(context).colorScheme.primaryContainer 
                : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
            title: const Text("Gemma 3 (High Accuracy)"),
            subtitle: const Text("Powerful reasoning for complex cards."),
            leading: const Icon(Icons.auto_awesome),
            trailing: config.selectedModel == "gemma3:4b" ? const Icon(Icons.check_circle, color: Colors.green) : null,
            onTap: () => ref.read(configProvider.notifier).setModel("gemma3:4b"),
          ),
          const SizedBox(height: 12),
          ListTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            tileColor: config.selectedModel == "moondream" 
                ? Theme.of(context).colorScheme.primaryContainer 
                : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
            title: const Text("Moondream (Lighter)"),
            subtitle: const Text("Lightweight model for quick scans."),
            leading: const Icon(Icons.bolt),
            trailing: config.selectedModel == "moondream" ? const Icon(Icons.check_circle, color: Colors.green) : null,
            onTap: () => ref.read(configProvider.notifier).setModel("moondream"),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
        color: Colors.blueAccent,
      ),
    );
  }
}
