import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'config_provider.dart';

final sheetDataProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final config = ref.watch(configProvider);
  
  // Ensure the base URL is correct before fetching
  api.updateBaseUrl(config.serverHost, config.serverPort);
  
  return api.getSheetData();
});
