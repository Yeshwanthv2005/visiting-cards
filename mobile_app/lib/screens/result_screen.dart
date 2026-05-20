import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/config_provider.dart';
import '../widgets/selected_image.dart';

class ResultScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> extractedData;
  final XFile xFile;

  const ResultScreen({
    super.key,
    required this.extractedData,
    required this.xFile,
  });

  @override
  ConsumerState<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<ResultScreen> {
  final Map<String, TextEditingController> _controllers = {};
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    widget.extractedData.forEach((key, value) {
      _controllers[key] = TextEditingController(text: value?.toString() ?? "");
    });
  }

  @override
  void dispose() {
    for (var c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _syncAndClean() async {
    setState(() => _isSyncing = true);
    try {
      final api = ref.read(apiServiceProvider);
      
      // Collect edited data
      Map<String, dynamic> finalData = {};
      _controllers.forEach((key, controller) {
        finalData[key] = controller.text;
      });

      // 1. Sync to Google Sheets via Backend
      await api.syncToSheet(finalData);

      // 2. Delete local image as requested by user
      await deleteSelectedImage(widget.xFile);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Successfully synced to Sheets! Local photo deleted."), backgroundColor: Colors.green),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Sync Error: $e"), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Edit Results"),
        actions: [
          if (!_isSyncing)
            TextButton.icon(
              onPressed: _syncAndClean, 
              icon: const Icon(Icons.cloud_upload_rounded),
              label: const Text("Sync & Close"),
            ),
        ],
      ),
      body: _isSyncing 
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: buildSelectedImage(widget.xFile),
                ),
                const SizedBox(height: 24),
                ..._controllers.entries.map((entry) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: TextField(
                      controller: entry.value,
                      decoration: InputDecoration(
                        labelText: entry.key.replaceAll("_", " ").toUpperCase(),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
                      ),
                    ),
                  );
                }).toList(),
              ],
            ),
    );
  }
}
