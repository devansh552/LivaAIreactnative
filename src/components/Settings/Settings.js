import { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import APIKeys from './APIKeys';
import GeneralSettings from './GeneralSettings';
import TaskManager from './TaskManager';
import VideoManager from './VideoManager';

const pages = [
  { key: 'generalSettings', title: 'General Settings' },
  { key: 'apiKeys', title: 'API Keys' },
  { key: 'videoManager', title: 'Video Manager' },
  { key: 'taskManager', title: 'Task Manager' },
];

const Settings = () => {
  const [selectedPage, setSelectedPage] = useState(pages[0].key);
  const [showContentPanel, setShowContentPanel] = useState(false);

  // Use device width for responsive design
  const isMobile = Dimensions.get('window').width < 768;

  const renderPageContent = () => {
    switch (selectedPage) {
      case 'generalSettings':
        return <GeneralSettings />;
      case 'apiKeys':
        return <APIKeys />;
      case 'videoManager':
        return <VideoManager />;
      case 'taskManager':
        return <TaskManager />;
      default:
        return <Text>Page not found.</Text>;
    }
  };

  const handlePageSelect = (pageKey) => {
    setSelectedPage(pageKey);
    if (isMobile) setShowContentPanel(true);
  };

  const renderMobileContentHeader = () => (
    <View style={styles.mobileHeader}>
      <TouchableOpacity style={styles.backButton} onPress={() => setShowContentPanel(false)}>
        <Text style={styles.backButtonText}>&larr; Back</Text>
      </TouchableOpacity>
      <Text style={styles.mobileHeaderTitle}>
        {pages.find((page) => page.key === selectedPage)?.title || ''}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      {isMobile ? (
        showContentPanel ? (
          <ScrollView style={styles.content}>
            {renderMobileContentHeader()}
            {renderPageContent()}
          </ScrollView>
        ) : (
          <View style={[styles.sidebar, styles.sidebarMobile]}>
            {pages.map((page) => (
              <TouchableOpacity
                key={page.key}
                style={[
                  styles.sidebarItem,
                  selectedPage === page.key && styles.sidebarItemActive,
                ]}
                onPress={() => handlePageSelect(page.key)}
              >
                <Text style={styles.sidebarItemText}>{page.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        <View style={styles.body}>
          <View style={styles.sidebar}>
            {pages.map((page) => (
              <TouchableOpacity
                key={page.key}
                style={[
                  styles.sidebarItem,
                  selectedPage === page.key && styles.sidebarItemActive,
                ]}
                onPress={() => handlePageSelect(page.key)}
              >
                <Text style={styles.sidebarItemText}>{page.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.content}>{renderPageContent()}</ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    padding: 16,
    backgroundColor: '#fff',
  },
  sidebarMobile: {
    width: '100%',
    borderRightWidth: 0,
  },
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  sidebarItemActive: {
    backgroundColor: '#e0e7ff',
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
  },
  mobileHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});



export default Settings;
